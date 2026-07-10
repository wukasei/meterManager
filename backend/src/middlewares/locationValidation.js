const { body, param, query, validationResult } = require('express-validator');

const validateName = (isOptional = false) => {
  let chain = body('name').trim();

  if (!isOptional) {
    chain = chain.notEmpty().withMessage('Name is required');
  } else {
    chain = chain.optional();
  }

  return chain.isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters.');
};

const validateAddress = () => body('address').optional({ nullable: true }).trim().isLength({ max: 1000 });

const validateTenantId = () =>
  body('tenant_id')
    .optional({ nullable: true })
    .custom((value) => value === null || (Number.isInteger(value) && value > 0))
    .withMessage('tenant_id must be a positive integer or null.');

const validateIsActive = () =>
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean value (true/false).');

const validateIdParam = () => param('id').isInt({ min: 1 }).withMessage('Location ID must be a positive integer');

const validateIdParamForAssignment = (paramName) =>
  param(paramName).isInt({ min: 1 }).withMessage(`${paramName} must be a positive integer.`);

const createLocationValidation = [validateName(false), validateAddress(), validateTenantId(), validateIsActive()];

const updateLocationValidation = [
  validateIdParam(),
  validateName(true),
  validateAddress(),
  validateTenantId(),
  validateIsActive(),
];

const getLocationByIdValidation = [validateIdParam()];

const getLocationsQueryValidation = [
  query('is_active').optional().isBoolean().withMessage('is_active filter must be a boolean.'),
  query('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name filter must be between 1 and 255 characters.'),
];

const assignTenantValidation = [validateIdParamForAssignment('locationId'), validateIdParamForAssignment('tenantId')];

const unassignTenantValidation = [validateIdParamForAssignment('locationId')];

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
  createLocationValidation,
  updateLocationValidation,
  getLocationByIdValidation,
  getLocationsQueryValidation,
  assignTenantValidation,
  unassignTenantValidation,
  handleValidationErrors,
};
