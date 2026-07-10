const express = require('express');
const router = express.Router();
const resourceDeliveryController = require('../controllers/resourceDeliveryController');
const {
  createResourceDeliveryValidation,
  updateResourceDeliveryValidation,
  getDeleteResourceDeliveryByIdValidation,
  getResourceDeliveriesQueryValidation,
  handleValidationErrors,
} = require('../middlewares/resourceDeliveryValidation');
const { checkJwt, checkRole } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     ResourceDelivery:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         location_id:
 *           type: integer
 *         energy_resource_type_id:
 *           type: integer
 *         delivery_date:
 *           type: string
 *           format: date
 *         quantity:
 *           type: number
 *         unit:
 *           type: string
 *         price_per_unit:
 *           type: number
 *         total_cost:
 *           type: number
 *         supplier:
 *           type: string
 */

/**
 * @swagger
 * /api/resource-deliveries:
 *   get:
 *     tags: [Resource Deliveries]
 *     parameters:
 *       - name: location_id
 *         in: query
 *         schema:
 *           type: integer
 *       - name: energy_resource_type_id
 *         in: query
 *         schema:
 *           type: integer
 *       - name: delivery_date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of deliveries
 */
router.get(
  '/',
  checkJwt,
  getResourceDeliveriesQueryValidation,
  handleValidationErrors,
  resourceDeliveryController.getAllResourceDeliveries
);

/**
 * @swagger
 * /api/resource-deliveries/{id}:
 *   get:
 *     tags: [Resource Deliveries]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Delivery found
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  checkJwt,
  getDeleteResourceDeliveryByIdValidation,
  handleValidationErrors,
  resourceDeliveryController.getResourceDeliveryById
);

/**
 * @swagger
 * /api/resource-deliveries:
 *   post:
 *     tags: [Resource Deliveries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResourceDelivery'
 *     responses:
 *       201:
 *         description: Delivery created
 */
router.post(
  '/',
  checkJwt,
  checkRole('admin'),
  createResourceDeliveryValidation,
  handleValidationErrors,
  resourceDeliveryController.createResourceDelivery
);

/**
 * @swagger
 * /api/resource-deliveries/{id}:
 *   put:
 *     tags: [Resource Deliveries]
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
 *             $ref: '#/components/schemas/ResourceDelivery'
 *     responses:
 *       200:
 *         description: Delivery updated
 *       404:
 *         description: Not found
 */
router.put(
  '/:id',
  checkJwt,
  checkRole('admin'),
  updateResourceDeliveryValidation,
  handleValidationErrors,
  resourceDeliveryController.updateResourceDelivery
);

/**
 * @swagger
 * /api/resource-deliveries/{id}:
 *   delete:
 *     tags: [Resource Deliveries]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Delivery deleted
 *       404:
 *         description: Not found
 */
router.delete(
  '/:id',
  checkJwt,
  checkRole('admin'),
  getDeleteResourceDeliveryByIdValidation,
  handleValidationErrors,
  resourceDeliveryController.deleteResourceDelivery
);

module.exports = router;
