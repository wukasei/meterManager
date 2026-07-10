'use strict';
const meterService = require('../services/meterService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('already exists') || errorMessage.includes('overlap') || errorMessage.includes('assigned'))
    return 409;
  if (errorMessage.includes('Cannot delete active') || errorMessage.includes('inactive')) return 400;

  return 500;
};

const sendErrorResponse = (res, error) => {
  const statusCode = mapErrorToStatus(error.message);
  const clientMessage = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
};

const getAllMeters = async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active,
      serial_number: req.query.serial_number,
      location_id: req.query.location_id,
      energy_resource_type_id: req.query.energy_resource_type_id,
    };

    const meters = await meterService.getAllMeters(filters);
    res.status(200).json({
      success: true,
      data: meters,
      count: meters.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getMeterById = async (req, res) => {
  try {
    const { id } = req.params;
    const meter = await meterService.getMeterById(id);

    if (!meter) throw new Error('Meter not found');

    res.status(200).json({ success: true, data: meter });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getMeterDependencies = async (req, res) => {
  try {
    const { id } = req.params;
    const dependencies = await meterService.getMeterDependencies(id);

    const message =
      dependencies.active_meter_tenants > 0 || dependencies.deliveries > 0
        ? `This meter has ${dependencies.active_meter_tenants} active meter tenants and ${dependencies.deliveries} deliveries that will be affected`
        : 'No active dependent objects';

    res.status(200).json({ success: true, data: dependencies, message });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createMeter = async (req, res) => {
  try {
    const meter = await meterService.createMeter(req.body);
    res.status(201).json({
      success: true,
      message: 'Meter created successfully',
      data: meter,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateMeter = async (req, res) => {
  try {
    const { id } = req.params;
    const meter = await meterService.updateMeter(id, req.body);

    let message = 'Meter updated successfully';
    if (req.body.is_active === false) {
      const dependencies = await meterService.getMeterDependencies(id);
      if (dependencies.active_meter_tenants === 0) {
        message += ' (no dependent objects affected)';
      } else {
        message += ` (deactivated ${dependencies.active_meter_tenants} meter tenants)`;
      }
    }

    res.status(200).json({ success: true, message: message, data: meter });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteMeter = async (req, res) => {
  try {
    const { id } = req.params;
    const dependencies = await meterService.getMeterDependencies(id);
    await meterService.deleteMeter(id);

    let message = 'Meter deleted permanently';
    const deletedItems = [];
    if (dependencies.active_meter_tenants > 0) deletedItems.push(`${dependencies.active_meter_tenants} meter tenants`);
    if (dependencies.deliveries > 0) deletedItems.push(`${dependencies.deliveries} deliveries`);
    if (deletedItems.length > 0) message += ` (also deleted: ${deletedItems.join(', ')})`;

    res.status(200).json({ success: true, message: message });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllMeterTenants = async (req, res) => {
  try {
    const filters = {
      meter_id: req.query.meter_id,
      tenant_id: req.query.tenant_id,
      active_only: req.query.active_only,
    };

    const meterTenants = await meterService.getAllMeterTenants(filters);
    res.status(200).json({ success: true, data: meterTenants, count: meterTenants.length });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createMeterTenant = async (req, res) => {
  try {
    const meterTenant = await meterService.createMeterTenant(req.body);
    res.status(201).json({
      success: true,
      message: 'Meter tenant assignment created successfully',
      data: meterTenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteMeterTenant = async (req, res) => {
  try {
    const { id } = req.params;
    await meterService.deleteMeterTenant(id);
    res.status(200).json({ success: true, message: 'Meter tenant assignment deleted permanently' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateMeterTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const meterTenant = await meterService.updateMeterTenant(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Meter tenant assignment updated successfully',
      data: meterTenant,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllMeters,
  getMeterById,
  getMeterDependencies,
  createMeter,
  updateMeter,
  deleteMeter,
  getAllMeterTenants,
  createMeterTenant,
  deleteMeterTenant,
  updateMeterTenant,
};
