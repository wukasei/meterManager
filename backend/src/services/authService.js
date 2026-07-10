const { User } = require('../../models');

class AuthService {
  async syncUser(payload) {
    console.log('--- syncUser --- Payload received:', payload);

    try {
      const auth0UserId = payload.sub;

      const email = payload['https://energy-api.local/email'] || '';
      const fullNameFromEmail =
        payload['https://energy-api.local/full_name'] || (email ? email.split('@')[0] : 'Unknown User');

      let userByEmail = email ? await User.findOne({ where: { email } }) : null;

      if (userByEmail && !userByEmail.is_active) {
        console.error(`Login blocked (email): ${email}`);
        return { inactive: true, message: 'Your account is deactivated. Contact admin.' };
      }

      let user = await User.findOne({ where: { auth0_user_id: auth0UserId } });

      if (!user) {
        if (userByEmail) {
          user = await userByEmail.update({
            auth0_user_id: auth0UserId,
            full_name: fullNameFromEmail || userByEmail.full_name,
            role: payload['https://energy-api.local/roles']?.[0] || userByEmail.role,
          });
        } else {
          user = await User.create({
            auth0_user_id: auth0UserId,
            email,
            full_name: fullNameFromEmail,
            role: payload['https://energy-api.local/roles']?.[0] || 'operator',
            is_active: true,
          });
        }
      } else {
        if (!user.is_active) {
          console.error(`Login blocked (auth0 id): ${auth0UserId}`);
          return { inactive: true, message: 'Your account is deactivated. Contact admin.' };
        }
        await user.update({
          full_name: fullNameFromEmail || user.full_name,
          role: payload['https://energy-api.local/roles']?.[0] || user.role,
          email: email || user.email,
        });
      }

      return {
        id: user.id,
        auth0_user_id: user.auth0_user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      };
    } catch (error) {
      console.error('Sync user error:', error.message);
      throw new Error(`User synchronisation error: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
