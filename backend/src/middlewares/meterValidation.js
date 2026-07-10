const { body, param, query, validationResult } = require('express-validator');

const validatePositiveInt = (field, location = body, isOptional = false) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();
  return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);
};

const validateBoolean = (field, location = body) =>
  location(field).optional().isBoolean().withMessage(`${field} must be a boolean value.`);

const validateDate = (field, isOptional = false, location = body) => {
  let chain = location(field);
  if (isOptional) {
    chain = chain.optional({ nullable: true });
  } else {
    chain = chain.notEmpty();
  }
  return chain.isISO8601().withMessage(`${field} must be a valid date (YYYY-MM-DD)`);
};

const createMeterValidation = [
  body('serial_number')
    .trim()
    .notEmpty()
    .withMessage('Serial number is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Serial number must be between 1 and 100 characters'),
  validatePositiveInt('location_id'),
  validatePositiveInt('energy_resource_type_id'),
  validateBoolean('is_active'),
];

const updateMeterValidation = [
  validatePositiveInt('id', param, false),
  body('serial_number')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Serial number must be between 1 and 100 characters'),
  validatePositiveInt('location_id', body, true),
  validatePositiveInt('energy_resource_type_id', body, true),
  validateBoolean('is_active'),
];

const getMeterByIdValidation = [validatePositiveInt('id', param, false)];

const getMetersQueryValidation = [
  validateBoolean('is_active', query),
  query('serial_number')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Serial number filter must be between 1 and 100 characters'),
  validatePositiveInt('location_id', query, true),
  validatePositiveInt('energy_resource_type_id', query, true),
];

const createMeterTenantValidation = [
  validatePositiveInt('meter_id'),
  validatePositiveInt('tenant_id'),
  validateDate('assigned_from', false),

  validateDate('assigned_to', true).custom((value, { req }) => {
    if (value && req.body.assigned_from) {
      if (new Date(value) <= new Date(req.body.assigned_from)) {
        throw new Error('Assigned to date must be after assigned from date');
      }
    }
    return true;
  }),
];

const updateMeterTenantValidation = [
  validatePositiveInt('id', param, false),
  validatePositiveInt('meter_id', body, true),
  validatePositiveInt('tenant_id', body, true),

  validateDate('assigned_from', true).custom((value, { req }) => {
    if (value && req.body.assigned_to) {
      if (new Date(value) >= new Date(req.body.assigned_to)) {
        throw new Error('Assigned from date must be before assigned to date');
      }
    }
    return true;
  }),

  validateDate('assigned_to', true).custom((value, { req }) => {
    const assignedFrom = req.body.assigned_from || req.originalAssignedFrom;

    if (value && assignedFrom) {
      if (new Date(value) <= new Date(assignedFrom)) {
        throw new Error('Assigned to date must be after assigned from date');
      }
    }
    return true;
  }),
];

const getMeterTenantByIdValidation = [validatePositiveInt('id', param, false)];

const getMeterTenantsQueryValidation = [
  validatePositiveInt('meter_id', query, true),
  validatePositiveInt('tenant_id', query, true),
  validateBoolean('active_only', query),
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
  createMeterValidation,
  updateMeterValidation,
  getMeterByIdValidation,
  getMetersQueryValidation,

  createMeterTenantValidation,
  updateMeterTenantValidation,
  getMeterTenantByIdValidation,
  getMeterTenantsQueryValidation,

  handleValidationErrors,
};
