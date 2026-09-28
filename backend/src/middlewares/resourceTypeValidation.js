const { body, param, query } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

const validateIdParam = () => 
  param('id').isInt({ min: 1 }).withMessage('Resource Type ID must be a positive integer');

// Спільна перевірка текстового поля: обов'язковість, обрізання пробілів і довжина
const validateTextField = (field, label, { min, max }, isOptional = false) => {
  let chain = body(field).trim();

  if (!isOptional) {
    chain = chain.notEmpty().withMessage(`${label} is required`).bail();
  } else {
    chain = chain.optional().notEmpty().withMessage(`${label} cannot be empty`).bail();
  }

  return chain
    .isLength({ min, max })
    .withMessage(`${label} must be between ${min} and ${max} characters.`);
};

const validateName = (isOptional = false) =>
  validateTextField('name', 'Name', { min: 2, max: 255 }, isOptional);

const validateUnit = (isOptional = false) =>
  validateTextField('unit', 'Unit', { min: 1, max: 50 }, isOptional);

const validateIsActive = () => 
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean value.');

const createResourceTypeValidation = [
  validateName(false),
  validateUnit(false),
  validateIsActive(),
];

const updateResourceTypeValidation = [
  validateIdParam(),
  validateName(true),
  validateUnit(true),
  validateIsActive(),
];

const getResourceTypeByIdValidation = [
  validateIdParam(),
];

const getResourceTypesQueryValidation = [
  query('is_active').optional().isBoolean().withMessage('is_active must be a boolean value'),
  
  query('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name filter must be between 1 and 255 characters'),
];


module.exports = {
  createResourceTypeValidation,
  updateResourceTypeValidation,
  getResourceTypeByIdValidation,
  getResourceTypesQueryValidation,
  handleValidationErrors,
};