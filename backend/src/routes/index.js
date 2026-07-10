const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

const locationRoutes = require('./locationRoutes');
const tenantRoutes = require('./tenantRoutes');

const meterRoutes = require('./meterRoutes');
const meterReadingRoutes = require('./meterReadingRoutes');
const meterTenantRoutes = require('./meterTenantRoutes');

const resourceTypeRoutes = require('./resourceTypeRoutes');
const resourceDeliveryRoutes = require('./resourceDeliveryRoutes');
const tariffRoutes = require('./tariffRoutes');

// const testRoute = require('./testRoute');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

router.use('/tenants', tenantRoutes);
router.use('/locations', locationRoutes);

router.use('/meters', meterRoutes);
router.use('/meter-tenants', meterTenantRoutes);
router.use('/meter-readings', meterReadingRoutes);
router.use('/resource-types', resourceTypeRoutes);
router.use('/resource-deliveries', resourceDeliveryRoutes);
router.use('/tariffs', tariffRoutes);

// router.use('/test', testRoute);

module.exports = router;
