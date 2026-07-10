const { body, param, query, validationResult } = require('express-validator');
const validatePositiveInt = (field, location = body, isOptional = false) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();
  return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);
};

const validateName = (isOptional = false) => {
  let chain = body('name').trim();

  if (!isOptional) {
    chain = chain.notEmpty().withMessage('Name is required');
  } else {
    chain = chain.optional().notEmpty().withMessage('Name cannot be empty');
  }

  return chain.isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters.');
};

const validateLocationIds = () =>
  body('location_ids')
    .optional()
    .isArray()
    .withMessage('location_ids must be an array')
    .bail()
    .custom((arr) => arr.every((id) => Number.isInteger(id) && id > 0))
    .withMessage('All location_ids must be positive integers.');

const validateOccupiedArea = () =>
  body('occupied_area').optional().isFloat({ min: 0 }).withMessage('Occupied area must be a non-negative number.');

const validateContactInfo = (field, maxLength) =>
  body(field)
    .optional()
    .trim()
    .isLength({ max: maxLength })
    .withMessage(`${field} must not exceed ${maxLength} characters.`);

const validateEmail = () => body('email').optional().isEmail().withMessage('Email must be valid.');

const validateIsActive = () =>
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean value.');

const createTenantValidation = [
  validateName(false),
  validateLocationIds(),
  validateOccupiedArea(),
  validateContactInfo('contact_person', 255),
  validateContactInfo('phone', 50),
  validateEmail(),
  validateIsActive(),
];

const updateTenantValidation = [
  validatePositiveInt('id', param, false),
  validateName(true),
  validateLocationIds(),
  validateOccupiedArea(),
  validateContactInfo('contact_person', 255),
  validateContactInfo('phone', 50),
  validateEmail(),
  validateIsActive(),
];

const getTenantByIdValidation = [validatePositiveInt('id', param, false)];

const getTenantsQueryValidation = [
  query('is_active').optional().isBoolean().withMessage('is_active must be a boolean value'),
  query('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name filter must be between 1 and 255 characters'),
  validatePositiveInt('location_id', query, true),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ 
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

module.exports = {
  createTenantValidation,
  updateTenantValidation,
  getTenantByIdValidation,
  getTenantsQueryValidation,
  handleValidationErrors,
};
