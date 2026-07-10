const { body, param, query, validationResult } = require('express-validator');

const VALID_ROLES = ['admin', 'manager', 'user'];

const validatePositiveInt = (field, location = param, isOptional = false) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();
  return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);
};

const validateFullName = (field, location = body, isOptional = true) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();

  return chain.isString().withMessage(`${field} must be a string.`);
};

const validateRole = (field, location = body, isOptional = true) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();

  return chain.isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}.`);
};

const validateIsActive = (field, location = body) =>
  location(field).optional().isBoolean().withMessage(`${field} must be a boolean.`);

const updateUserValidation = [
  validatePositiveInt('id', param, false),
  validateFullName('full_name', body, true),
  validateRole('role', body, true),
  validateIsActive('is_active', body),
];

const getUserByIdValidation = [validatePositiveInt('id', param, false)];

const getUsersQueryValidation = [
  validateFullName('full_name', query, true),
  validateRole('role', query, true),
  validateIsActive('is_active', query),
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
  updateUserValidation,
  getUserByIdValidation,
  getUsersQueryValidation,
  handleValidationErrors,
};
