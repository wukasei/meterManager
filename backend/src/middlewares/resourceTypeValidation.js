const { body, param, query, validationResult } = require('express-validator');


const validateIdParam = () => 
  param('id').isInt({ min: 1 }).withMessage('Resource Type ID must be a positive integer');

const validateName = (isOptional = false) => {
  let chain = body('name').trim();
  
  if (!isOptional) {
    chain = chain.notEmpty().withMessage('Name is required');
  } else {
    chain = chain.optional().notEmpty().withMessage('Name cannot be empty'); 
  }
  
  return chain
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters.');
};

const validateUnit = (isOptional = false) => {
  let chain = body('unit').trim();
  
  if (!isOptional) {
    chain = chain.notEmpty().withMessage('Unit is required');
  } else {
    chain = chain.optional().notEmpty().withMessage('Unit cannot be empty');
  }
  
  return chain
    .isLength({ min: 1, max: 50 })
    .withMessage('Unit must be between 1 and 50 characters.');
};

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
  createResourceTypeValidation,
  updateResourceTypeValidation,
  getResourceTypeByIdValidation,
  getResourceTypesQueryValidation,
  handleValidationErrors,
};