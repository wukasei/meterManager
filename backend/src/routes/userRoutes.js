const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  updateUserValidation,
  getUserByIdValidation,
  getUsersQueryValidation,
  handleValidationErrors,
} = require('../middlewares/userValidation');
const { checkJwt, checkRole } = require('../middlewares/authMiddleware');

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
 *           enum: [admin, manager, user]
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     parameters:
 *       - name: full_name
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter users by full name
 *       - name: role
 *         in: query
 *         schema:
 *           type: string
 *           enum: [admin, manager, user]
 *         description: Filter users by role
 *       - name: is_active
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter users by active status
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  '/',
  checkJwt,
  ...getUsersQueryValidation,
  handleValidationErrors,
  userController.getAllUsers
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  checkJwt,
  ...getUserByIdValidation,
  handleValidationErrors,
  userController.getUserById
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, user]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: User not found
 */
router.put(
  '/:id',
  checkJwt,
  checkRole('admin'),
  ...updateUserValidation,
  handleValidationErrors,
  userController.updateUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Permanently deletes a user by ID
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted permanently
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  checkJwt,
  checkRole('admin'),
  ...getUserByIdValidation,
  handleValidationErrors,
  userController.deleteUser
);

module.exports = router;
