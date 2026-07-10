const express = require('express');
const router = express.Router();
const resourceTypeController = require('../controllers/resourceTypeController');
const {
  createResourceTypeValidation,
  updateResourceTypeValidation,
  getResourceTypeByIdValidation,
  getResourceTypesQueryValidation,
  handleValidationErrors,
} = require('../middlewares/resourceTypeValidation');
const { checkJwt, checkRole } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     ResourceType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         unit:
 *           type: string
 *         is_active:
 *           type: boolean
 */

/**
 * @swagger
 * /api/resource-types:
 *   get:
 *     tags: [Resource Types]
 *     parameters:
 *       - name: is_active
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - name: name
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by name (partial match)
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  '/',
  checkJwt,
  getResourceTypesQueryValidation,
  handleValidationErrors,
  resourceTypeController.getAllResourceTypes
);

/**
 * @swagger
 * /api/resource-types/{id}:
 *   get:
 *     tags: [Resource Types]
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
 *         description: Not found
 */
router.get(
  '/:id',
  checkJwt,
  getResourceTypeByIdValidation,
  handleValidationErrors,
  resourceTypeController.getResourceTypeById
);

/**
 * @swagger
 * /api/resource-types:
 *   post:
 *     tags: [Resource Types]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Resource type already exists
 */
router.post(
  '/',
  checkJwt,
  checkRole('admin'),
  createResourceTypeValidation,
  handleValidationErrors,
  resourceTypeController.createResourceType
);

/**
 * @swagger
 * /api/resource-types/{id}:
 *   put:
 *     description: Updates resource type. When deactivating (is_active=false), all dependent meters will be automatically deactivated.
 *     tags: [Resource Types]
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
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ResourceType'
 *       404:
 *         description: Resource type not found
 *       409:
 *         description: Resource type already exists
 */
router.put(
  '/:id',
  checkJwt,
  checkRole('admin'),
  updateResourceTypeValidation,
  handleValidationErrors,
  resourceTypeController.updateResourceType
);

/**
 * @swagger
 * /api/resource-types/{id}:
 *   delete:
 *     description: Permanently deletes resource type and ALL related data (meters, deliveries). Only inactive resource types can be deleted.
 *     tags: [Resource Types]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete active resource type
 *       404:
 *         description: Resource type not found
 */
router.delete(
  '/:id',
  checkJwt,
  checkRole('admin'),
  getResourceTypeByIdValidation,
  handleValidationErrors,
  resourceTypeController.deleteResourceType
);

/**
 * @swagger
 * /api/resource-types/{id}/dependencies:
 *   get:
 *     description: Returns information about dependent objects (meters, deliveries) for cascade deactivation warning
 *     tags: [Resource Types]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     active_meters:
 *                       type: integer
 *                     deliveries:
 *                       type: integer
 *                 message:
 *                   type: string
 *       404:
 *         description: Resource type not found
 */
router.get('/:id/dependencies', checkJwt, getResourceTypeByIdValidation, handleValidationErrors, resourceTypeController.getResourceTypeDependencies);

module.exports = router;
