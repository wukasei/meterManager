'use strict';
const meterTenantService = require('../services/meterTenantService');

const mapErrorToStatus = (error) => {
  const errorMessage = error.message;

  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('already assigned') || errorMessage.includes('overlap')) return 409;
  if (error.name === 'SequelizeValidationError' || errorMessage.includes('Invalid')) return 400;

  return 500;
};

const sendErrorResponse = (res, error) => {
  const statusCode = mapErrorToStatus(error);
  const clientMessage = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    errors: error.errors
  });
};

const getAllMeterTenants = async (req, res) => {
  try {
    const filters = {};
    ['tenant_id', 'meter_id', 'assigned_from', 'assigned_to'].forEach((key) => {
      if (req.query[key] !== undefined && req.query[key] !== '') {
        filters[key] = req.query[key];
      }
    });

    const meterTenants = await meterTenantService.getAllMeterTenants(filters);

    res.status(200).json({
      success: true,
      data: meterTenants,
      count: meterTenants.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getMeterTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const meterTenant = await meterTenantService.getMeterTenantById(id);

    if (!meterTenant) throw new Error('MeterTenant not found');

    res.status(200).json({ success: true, data: meterTenant });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createMeterTenant = async (req, res) => {
  try {
    const meterTenant = await meterTenantService.createMeterTenant(req.body);

    res.status(201).json({
      success: true,
      message: 'MeterTenant created successfully',
      data: meterTenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateMeterTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const meterTenant = await meterTenantService.updateMeterTenant(id, req.body);

    res.status(200).json({
      success: true,
      message: 'MeterTenant updated successfully',
      data: meterTenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteMeterTenant = async (req, res) => {
  try {
    const { id } = req.params;
    await meterTenantService.deleteMeterTenant(id);

    res.status(200).json({
      success: true,
      message: 'MeterTenant deleted successfully',
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllMeterTenants,
  getMeterTenantById,
  createMeterTenant,
  updateMeterTenant,
  deleteMeterTenant,
};
