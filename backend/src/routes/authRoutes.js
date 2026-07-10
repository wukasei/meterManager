const express = require('express');
const { checkJwt, logAuth } = require('../middlewares/authMiddleware');
const AuthController = require('../controllers/authController');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         auth0_user_id:
 *           type: string
 *         full_name:
 *           type: string
 *         role:
 *           type: string
 *         is_active:
 *           type: boolean
 */

/**
 * @swagger
 * /api/auth/verify-token:
 *   get:
 *     tags: [Auth]
 *     description: Verifies the JWT token and synchronizes the user with the database, returning user data.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: User is inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: null
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/verify-token', checkJwt, logAuth, AuthController.verifyToken);

module.exports = router;
