const { body, param, query } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

/**
 * Спільна частина для всіх полів: обов'язкове чи необов'язкове поле
 * @param {string} field
 * @param {function} location
 * @param {boolean} isOptional
 * @param {boolean} isRequired
 */
const buildChain = (field, location, isOptional, isRequired) => {
  let chain = location(field);

  if (isRequired) chain = chain.notEmpty().withMessage(`${field} is required`).bail();
  if (isOptional) chain = chain.optional();

  return chain;
};

const validatePositiveInt = (field, location = body, isOptional = false, isRequired = false) =>
  buildChain(field, location, isOptional, isRequired)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer.`);

const validateDate = (field, location = body, isOptional = false, isRequired = false) =>
  buildChain(field, location, isOptional, isRequired)
    .isISO8601()
    .withMessage(`${field} must be a valid date.`);

const validateNonNegativeFloat = (field, location = body, isOptional = false, isRequired = false) =>
  buildChain(field, location, isOptional, isRequired)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a non-negative number.`);

const createResourceDeliveryValidation = [
  validatePositiveInt('location_id', body, false, true),
  validatePositiveInt('energy_resource_type_id', body, false, true),
  validateDate('delivery_date', body, false, true),
  validateNonNegativeFloat('quantity', body, false, true),

  body('unit').notEmpty().withMessage('unit is required').bail().isString().withMessage('unit must be a string'),

  validateNonNegativeFloat('price_per_unit', body, true, false),
  validateNonNegativeFloat('total_cost', body, true, false),

  body('supplier').optional().isString().withMessage('supplier must be a string'),
];

const updateResourceDeliveryValidation = [
  validatePositiveInt('id', param),

  validatePositiveInt('location_id', body, true, false),
  validatePositiveInt('energy_resource_type_id', body, true, false),
  validateDate('delivery_date', body, true, false),
  validateNonNegativeFloat('quantity', body, true, false),

  body('unit').optional().isString().withMessage('unit must be a string'),

  validateNonNegativeFloat('price_per_unit', body, true, false),
  validateNonNegativeFloat('total_cost', body, true, false),

  body('supplier').optional().isString().withMessage('supplier must be a string'),
];

const getDeleteResourceDeliveryByIdValidation = [validatePositiveInt('id', param)];

const getResourceDeliveriesQueryValidation = [
  validatePositiveInt('location_id', query, true, false),
  validatePositiveInt('energy_resource_type_id', query, true, false),
  validateDate('delivery_date', query, true, false),
];

module.exports = {
  createResourceDeliveryValidation,
  updateResourceDeliveryValidation,
  getDeleteResourceDeliveryByIdValidation,
  getResourceDeliveriesQueryValidation,
  handleValidationErrors,
};
