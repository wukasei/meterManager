const express = require('express');
const router = express.Router();
const tariffController = require('../controllers/tariffController');
const {
  createTariffValidation,
  updateTariffValidation,
  getTariffByIdValidation,
  getTariffsQueryValidation,
  handleValidationErrors,
} = require('../middlewares/tariffValidation');
const { checkJwt, checkRole } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Tariff:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         location_id:
 *           type: integer
 *         energy_resource_type_id:
 *           type: integer
 *         price:
 *           type: number
 *           format: decimal
 *         valid_from:
 *           type: string
 *           format: date
 *         valid_to:
 *           type: string
 *           format: date
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/tariffs:
 *   get:
 *     tags: [Tariffs]
 *     parameters:
 *       - name: location_id
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *       - name: energy_resource_type_id
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by energy resource type ID
 *       - name: valid_from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Show tariffs valid from this date
 *       - name: valid_to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Show tariffs valid until this date
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', checkJwt, getTariffsQueryValidation, handleValidationErrors, tariffController.getAllTariffs);

/**
 * @swagger
 * /api/tariffs/{id}:
 *   get:
 *     tags: [Tariffs]
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
 *         description: Tariff not found
 */
router.get('/:id', checkJwt, getTariffByIdValidation, handleValidationErrors, tariffController.getTariffById);

/**
 * @swagger
 * /api/tariffs:
 *   post:
 *     tags: [Tariffs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location_id
 *               - energy_resource_type_id
 *               - price
 *               - valid_from
 *             properties:
 *               location_id:
 *                 type: integer
 *               energy_resource_type_id:
 *                 type: integer
 *               price:
 *                 type: number
 *                 format: decimal
 *               valid_from:
 *                 type: string
 *                 format: date
 *               valid_to:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Overlapping tariff period exists
 */
router.post(
  '/',
  checkJwt,
  checkRole('admin'),
  createTariffValidation,
  handleValidationErrors,
  tariffController.createTariff
);

/**
 * @swagger
 * /api/tariffs/{id}:
 *   put:
 *     tags: [Tariffs]
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
 *               location_id:
 *                 type: integer
 *               energy_resource_type_id:
 *                 type: integer
 *               price:
 *                 type: number
 *                 format: decimal
 *               valid_from:
 *                 type: string
 *                 format: date
 *               valid_to:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Tariff not found
 *       409:
 *         description: Overlapping tariff period exists
 */
router.put(
  '/:id',
  checkJwt,
  checkRole('admin'),
  updateTariffValidation,
  handleValidationErrors,
  tariffController.updateTariff
);

/**
 * @swagger
 * /api/tariffs/{id}:
 *   delete:
 *     summary: Delete tariff
 *     description: Permanently deletes a tariff by ID
 *     tags: [Tariffs]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tariff deleted permanently
 *       404:
 *         description: Tariff not found
 */
router.delete(
  '/:id',
  checkJwt,
  checkRole('admin'),
  getTariffByIdValidation,
  handleValidationErrors,
  tariffController.deleteTariff
);
/**
 * @swagger
 * /api/tariffs/applicable:
 *   get:
 *     tags: [Tariffs]
 *     summary: Get applicable tariff for location, resource and date
 *     parameters:
 *       - name: location_id
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: energy_resource_type_id
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: reading_date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Applicable tariff found
 *       404:
 *         description: No applicable tariff
 */
router.get('/applicable', checkJwt, tariffController.getApplicableTariff);


module.exports = router;
