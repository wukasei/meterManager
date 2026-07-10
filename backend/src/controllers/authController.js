'use strict';
const AuthService = require('../services/authService');

class AuthController {
  constructor() {
    this.verifyToken = this.verifyToken.bind(this);
  }

  verifyToken = async (req, res) => {
    const payload = req.auth?.payload;
    const auth0UserId = payload?.sub;

    try {
      if (!auth0UserId) {
        return res.status(401).json({ message: 'Authorization token invalid or missing user identifier (sub).' });
      }

      const user = await AuthService.syncUser(payload);

      if (user.inactive) {
        return res.status(403).json({
          message: user.message || 'Access denied: User is inactive.',
          user: null,
        });
      }

      res.status(200).json({
        message: 'Token verified and user synchronized successfully.',
        user,
      });
    } catch (error) {
      console.error('Error in verifyToken:', error);
      res.status(500).json({
        message: 'Internal server error during token verification and user synchronization.',
      });
    }
  };
}

module.exports = new AuthController();
