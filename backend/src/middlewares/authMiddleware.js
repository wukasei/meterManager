const { auth } = require('express-oauth2-jwt-bearer');

const ROLE_CLAIM_KEY = process.env.AUTH0_ROLE_CLAIM_KEY || 'https://energy-api.local/roles';

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: 'RS256',
});

function logAuth(req, res, next) {
    console.log('User ID:', req.auth?.payload?.sub);
    next();
}

function checkRole(requiredRole) {
  return (req, res, next) => {
    const userRoles = req.auth?.payload?.[ROLE_CLAIM_KEY] || [];

    if (userRoles.includes(requiredRole)) {
      return next();
    }

    return res.status(403).json({
      message: 'Access denied. You do not have the necessary permissions.',
    });
  };
}

module.exports = { checkJwt, checkRole, logAuth };
