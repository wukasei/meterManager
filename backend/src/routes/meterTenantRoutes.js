const express = require('express');
const router = express.Router();
const meterTenantController = require('../controllers/meterTenantController');
const {
  createMeterTenantValidation,
  getMeterTenantByIdValidation,
  getMeterTenantsQueryValidation,
  handleValidationErrors,
} = require('../middlewares/meterValidation');
const { checkJwt, checkRole } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     MeterTenant:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         tenant_id:
 *           type: integer
 *         meter_id:
 *           type: integer
 *         assigned_from:
 *           type: string
 *           format: date
 *         assigned_to:
 *           type: string
 *           format: date
 */

/**
 * @swagger
* /api/meter-tenants:
 *   get:
 *     tags: [Meter-Tenants]
 *     parameters:
 *       - name: meter_id
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by meter ID
 *       - name: tenant_id
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by tenant ID
 *       - name: active_only
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Show only active assignments
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', checkJwt, getMeterTenantsQueryValidation, handleValidationErrors, meterTenantController.getAllMeterTenants);

/**
 * @swagger
 * /api/meter-tenants:
 *   post:
 *     tags: [Meter-Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meter_id
 *               - tenant_id
 *               - assigned_from
 *             properties:
 *               meter_id:
 *                 type: integer
 *               tenant_id:
 *                 type: integer
 *               assigned_from:
 *                 type: string
 *                 format: date
 *               assigned_to:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Assignment created successfully
 */
router.post(
  '/',
  checkJwt,
  checkRole('admin'),
  createMeterTenantValidation,
  handleValidationErrors,
  meterTenantController.createMeterTenant
);

/**
 * @swagger
 * /api/meter-tenants/{id}:
 *   put:
 *     tags: [Meter-Tenants]
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
 *               meter_id:
 *                 type: integer
 *               tenant_id:
 *                 type: integer
 *               assigned_from:
 *                 type: string
 *                 format: date
 *               assigned_to:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       400:
 *         description: Invalid data or inactive entities
 *       404:
 *         description: Assignment or related entity not found
 *       409:
 *         description: Overlapping assignment
 */
router.put(
  '/:id',
  checkJwt,
  checkRole('admin'),
  getMeterTenantByIdValidation,
  createMeterTenantValidation,
  handleValidationErrors,
  meterTenantController.updateMeterTenant
);

/**
 * @swagger
 * /api/meter-tenants/{id}:
 *   delete:
 *     tags: [Meter-Tenants]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assignment deleted
 *       404:
 *         description: Assignment not found
 */
router.delete(
  '/:id',
  checkJwt,
  checkRole('admin'),
  getMeterTenantByIdValidation,
  handleValidationErrors,
  meterTenantController.deleteMeterTenant
);

module.exports = router;
