const { User } = require('../../models');

const CLAIM_NAMESPACE = 'https://energy-api.local';
const CLAIMS = {
  email: `${CLAIM_NAMESPACE}/email`,
  fullName: `${CLAIM_NAMESPACE}/full_name`,
  roles: `${CLAIM_NAMESPACE}/roles`,
};

const DEFAULT_ROLE = 'user';
const INACTIVE_RESULT = { inactive: true, message: 'Your account is deactivated. Contact admin.' };

// Поля користувача, які можна віддавати назовні
function toPublicUser(user) {
  return {
    id: user.id,
    auth0_user_id: user.auth0_user_id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
  };
}

class AuthService {
  async syncUser(payload) {
    // Логуємо лише ідентифікатор Auth0, без персональних даних
    console.log('--- syncUser --- for Auth0 user:', payload.sub);

    try {
      const auth0UserId = payload.sub;
      const email = payload[CLAIMS.email] || '';
      const fullNameFromToken = payload[CLAIMS.fullName];
      const roleFromToken = payload[CLAIMS.roles]?.[0];
      // Ім'я з email — лише запасний варіант для НОВОГО користувача, в якого ще немає імені
      const fallbackName = email ? email.split('@')[0] : 'Unknown User';

      const userByEmail = email ? await User.findOne({ where: { email } }) : null;

      if (userByEmail && !userByEmail.is_active) {
        console.error(`Login blocked (email): ${email}`);
        return { ...INACTIVE_RESULT };
      }

      let user = await User.findOne({ where: { auth0_user_id: auth0UserId } });

      if (!user) {
        if (userByEmail) {
          // Користувача створив адміністратор заздалегідь — прив'язуємо до нього Auth0-акаунт
          user = await userByEmail.update({
            auth0_user_id: auth0UserId,
            full_name: fullNameFromToken || userByEmail.full_name,
            role: roleFromToken || userByEmail.role,
          });
        } else {
          user = await User.create({
            auth0_user_id: auth0UserId,
            email,
            full_name: fullNameFromToken || fallbackName,
            role: roleFromToken || DEFAULT_ROLE,
            is_active: true,
          });
        }
      } else {
        if (!user.is_active) {
          console.error(`Login blocked (auth0 id): ${auth0UserId}`);
          return { ...INACTIVE_RESULT };
        }
        await user.update({
          full_name: fullNameFromToken || user.full_name,
          role: roleFromToken || user.role,
          email: email || user.email,
        });
      }

      return toPublicUser(user);
    } catch (error) {
      console.error('Sync user error:', error.message);
      throw new Error(`User synchronisation error: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
