'use strict';
const meterReadingService = require('../services/meterReadingService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('already exists') || errorMessage.includes('overlap')) return 409;
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

const getAllReadings = async (req, res) => {
  try {
    const filters = {
      meter_tenant_id: req.query.meter_tenant_id,
      reading_date: req.query.reading_date,
      executor_name: req.query.executor_name,
    };

    const readings = await meterReadingService.getAllReadings(filters);

    const plainReadings = Array.isArray(readings) ? readings.map((r) => (r.toJSON ? r.toJSON() : r)) : readings;

    res.status(200).json({
      success: true,
      data: plainReadings,
      count: plainReadings.length,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;
    const reading = await meterReadingService.getReadingById(id);

    if (!reading) throw new Error('Meter reading not found');

    res.status(200).json({ success: true, data: reading });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createReading = async (req, res) => {
  try {
    const reading = await meterReadingService.createReading(req.body);

    res.status(201).json({
      success: true,
      message: 'Meter reading created successfully',
      data: reading,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateReading = async (req, res) => {
  try {
    const { id } = req.params;
    const reading = await meterReadingService.updateReading(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Meter reading updated successfully',
      data: reading,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteReading = async (req, res) => {
  try {
    const { id } = req.params;
    await meterReadingService.deleteReading(id);

    res.status(200).json({
      success: true,
      message: 'Meter reading deleted successfully',
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getReadingsSummary = async (req, res) => {
  try {
    const summary = await meterReadingService.getReadingsSummary(req.query);

    res.status(200).json({
      success: true,
      message: 'Meter readings summary fetched successfully',
      data: summary,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = {
  getAllReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
  getReadingsSummary,
};
