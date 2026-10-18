const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const {
  createLocationValidation,
  updateLocationValidation,
  getLocationByIdValidation,
  getLocationsQueryValidation,
  handleValidationErrors,
} = require('../middlewares/locationValidation');
const { checkJwt, checkRole, logAuth } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         is_active:
 *           type: boolean
 *     LocationDependencies:
 *       type: object
 *       properties:
 *         active_meters:
 *           type: integer
 *           description: Number of active meters in this location
 *         deliveries:
 *           type: integer
 *           description: Number of resource deliveries for this location
 */

/**
 * @swagger
 * /api/locations:
 *   get:
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', checkJwt, getLocationsQueryValidation, handleValidationErrors, locationController.getAllLocations);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     tags: [Locations]
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
router.get('/:id', checkJwt, getLocationByIdValidation, handleValidationErrors, locationController.getLocationById);

/**
 * @swagger
 * /api/locations/{id}/dependencies:
 *   get:
 *     summary: Get location dependencies info
 *     description: Returns information about dependent objects (meters, deliveries) for cascade deactivation warning
 *     tags: [Locations]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Dependencies information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/LocationDependencies'
 *                 message:
 *                   type: string
 *                   example: "This location has 3 active meters that will be deactivated"
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Location not found"
 */
router.get(
  '/:id/dependencies',
  checkJwt,
  getLocationByIdValidation,
  handleValidationErrors,
  locationController.getLocationDependencies
);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/',
  checkJwt,
  logAuth,
  checkRole('admin'),
  createLocationValidation,
  handleValidationErrors,
  locationController.createLocation
);

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Update location with cascade deactivation
 *     description: Updates location. When deactivating (is_active=false), all dependent meters will be automatically deactivated.
 *     tags: [Locations]
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
 *               address:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *                 description: Setting to false will cascade deactivate all dependent meters
 *     responses:
 *       200:
 *         description: Location updated successfully (with cascade info if deactivated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Location updated successfully (deactivated 3 meters)"
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 */
router.put(
  '/:id',
  checkJwt,
  checkRole('admin'),
  updateLocationValidation,
  handleValidationErrors,
  locationController.updateLocation
);

/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     summary: Delete location with cascade deletion
 *     description: Permanently deletes location and ALL related data (meters, deliveries, meter assignments). Only inactive locations can be deleted. WARNING - This action cannot be undone!
 *     tags: [Locations]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Location and all related data deleted permanently
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Location deleted permanently (also deleted: 3 meters, 5 deliveries)"
 *       400:
 *         description: Cannot delete active location
 *       404:
 *         description: Location not found
 */
router.delete(
  '/:id',
  checkJwt,
  checkRole('admin'),
  getLocationByIdValidation,
  handleValidationErrors,
  locationController.deleteLocation
);

module.exports = router;