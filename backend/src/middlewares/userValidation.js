const { body, param, query } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

const VALID_ROLES = ['admin', 'manager', 'user'];

const validatePositiveInt = (field, location = param, isOptional = false) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();
  return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);
};

const validateFullName = (field, location = body, isOptional = true) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();

  return chain
    .isString()
    .withMessage(`${field} must be a string.`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${field} cannot be empty.`)
    .bail()
    .isLength({ max: 255 })
    .withMessage(`${field} must not exceed 255 characters.`);
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

module.exports = {
  updateUserValidation,
  getUserByIdValidation,
  getUsersQueryValidation,
  handleValidationErrors,
};
