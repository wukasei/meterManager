'use strict';
const resourceDeliveryService = require('../services/resourceDeliveryService');

const mapErrorToStatus = (errorMessage) => {
  if (errorMessage.includes('not found')) return 404;
  if (errorMessage.includes('Invalid') || errorMessage.includes('required') || errorMessage.includes('format'))
    return 400;
  return 500;
};

const sendErrorResponse = (res, error, defaultStatusCode = 500) => {
  const statusCode = mapErrorToStatus(error.message);

  const clientMessage = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
};

const getAllResourceDeliveries = async (req, res) => {
  try {
    const deliveries = await resourceDeliveryService.getAllDeliveries(req.query);

    const data = deliveries.data || deliveries;
    const count = deliveries.count !== undefined ? deliveries.count : Array.isArray(data) ? data.length : 0;

    res.status(200).json({
      success: true,
      data: data,
      count: count,
    });
  } catch (error) {
    sendErrorResponse(res, error, 500);
  }
};

const getResourceDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await resourceDeliveryService.getDeliveryById(id);

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    res.status(200).json({ success: true, data: delivery });
  } catch (error) {
    sendErrorResponse(res, error, 500);
  }
};

const createResourceDelivery = async (req, res) => {
  try {
    const delivery = await resourceDeliveryService.createResourceDelivery(req.body);

    res.status(201).json({
      success: true,
      message: 'Delivery created successfully',
      data: delivery,
    });
  } catch (error) {
    sendErrorResponse(res, error, 400);
  }
};

const updateResourceDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await resourceDeliveryService.updateResourceDelivery(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Delivery updated successfully',
      data: delivery,
    });
  } catch (error) {
    sendErrorResponse(res, error, 400);
  }
};

const deleteResourceDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    await resourceDeliveryService.deleteResourceDelivery(id);

    res.status(200).json({
      success: true,
      message: 'Delivery deleted successfully',
    });
  } catch (error) {
    sendErrorResponse(res, error, 400);
  }
};

module.exports = {
  getAllResourceDeliveries,
  getResourceDeliveryById,
  createResourceDelivery,
  updateResourceDelivery,
  deleteResourceDelivery,
};
