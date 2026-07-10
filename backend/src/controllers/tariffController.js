'use strict';
const tariffService = require('../services/tariffService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('Overlapping') || errorMessage.includes('overlaps')) return 409;
  if (errorMessage.includes('Invalid') || errorMessage.includes('Data mismatch')) return 400;
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

const getAllTariffs = async (req, res) => {
  try {
    const filters = {
      location_id: req.query.location_id,
      energy_resource_type_id: req.query.energy_resource_type_id,
      valid_from: req.query.valid_from,
      valid_to: req.query.valid_to,
    };

    const tariffs = await tariffService.getAllTariffs(filters);

    res.status(200).json({
      success: true,
      data: tariffs,
      count: tariffs.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getTariffById = async (req, res) => {
  try {
    const { id } = req.params;
    const tariff = await tariffService.getTariffById(id);

    if (!tariff) throw new Error('Tariff not found');

    res.status(200).json({ success: true, data: tariff });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createTariff = async (req, res) => {
  try {
    const tariff = await tariffService.createTariff(req.body);

    res.status(201).json({
      success: true,
      message: 'Tariff created successfully',
      data: tariff,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateTariff = async (req, res) => {
  try {
    const { id } = req.params;
    const tariff = await tariffService.updateTariff(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Tariff updated successfully',
      data: tariff,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteTariff = async (req, res) => {
  try {
    const { id } = req.params;
    await tariffService.deleteTariff(id);

    res.status(200).json({
      success: true,
      message: 'Tariff deleted permanently',
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getApplicableTariff = async (req, res) => {
  try {
    const { location_id, energy_resource_type_id, reading_date } = req.query;

    if (!location_id || !energy_resource_type_id || !reading_date) {
      throw new Error('Location ID, Resource Type ID, and Reading Date are required filters.');
    }

    const tariff = await tariffService.getApplicableTariff(location_id, energy_resource_type_id, reading_date);

    if (!tariff) throw new Error('Applicable tariff not found for the given criteria.');

    res.status(200).json({ success: true, data: tariff });
  } catch (error) {
    const customError = error.message.includes('not found') ? error : new Error('Failed to find applicable tariff.');
    sendErrorResponse(res, customError);
  }
};

module.exports = {
  getAllTariffs,
  getTariffById,
  createTariff,
  updateTariff,
  deleteTariff,
  getApplicableTariff,
};
