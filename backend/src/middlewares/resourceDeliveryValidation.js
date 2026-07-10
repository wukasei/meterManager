const { body, param, query, validationResult } = require('express-validator');

/**
 * Валідація позитивного цілого числа (ID)
 * @param {string} field
 * @param {function} location
 * @param {boolean} isOptional
 * @param {boolean} isRequired
 */
const validatePositiveInt = (field, location = body, isOptional = false, isRequired = false) => {
  let chain = location(field);

  if (isRequired) chain = chain.notEmpty().withMessage(`${field} is required`);
  if (isOptional) chain = chain.optional();

  return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);
};

const validateDate = (field, location = body, isOptional = false, isRequired = false) => {
  let chain = location(field);

  if (isRequired) chain = chain.notEmpty().withMessage(`${field} is required`);
  if (isOptional) chain = chain.optional();

  return chain.isISO8601().withMessage(`${field} must be a valid date.`);
};

const validateNonNegativeFloat = (field, location = body, isOptional = false, isRequired = false) => {
  let chain = location(field);

  if (isRequired) chain = chain.notEmpty().withMessage(`${field} is required`);
  if (isOptional) chain = chain.optional();

  return chain.isFloat({ min: 0 }).withMessage(`${field} must be a non-negative number.`);
};

const createResourceDeliveryValidation = [
  validatePositiveInt('location_id', body, false, true),
  validatePositiveInt('energy_resource_type_id', body, false, true),
  validateDate('delivery_date', body, false, true),
  validateNonNegativeFloat('quantity', body, false, true),

  body('unit').notEmpty().withMessage('unit is required').isString().withMessage('unit must be a string'),

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

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

module.exports = {
  createResourceDeliveryValidation,
  updateResourceDeliveryValidation,
  getDeleteResourceDeliveryByIdValidation,
  getResourceDeliveriesQueryValidation,
  handleValidationErrors,
};
