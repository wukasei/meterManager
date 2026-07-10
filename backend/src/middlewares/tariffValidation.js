const { body, param, query, validationResult } = require('express-validator');


const validatePositiveInt = (field, location = body, isOptional = false) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();
  return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);
}

const validateDate = (field, location = body, isOptional = false, isRequired = false) => {
    let chain = location(field);
    if (isRequired) chain = chain.notEmpty().withMessage(`${field} is required`);
    if (isOptional) chain = chain.optional({ nullable: true });
    
    return chain
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage(`${field} must be a valid date in YYYY-MM-DD format`);
};

const validateValidToDate = () => 
    validateDate('valid_to', body, true)
    .custom((value, { req }) => {
      const validFrom = req.body.valid_from;
      const validTo = value;

      if (validTo && validFrom) {
        if (new Date(validTo) <= new Date(validFrom)) {
          throw new Error('valid_to date must be after valid_from date.');
        }
      }
      return true;
    });


const createTariffValidation = [
  validatePositiveInt('location_id'),
  validatePositiveInt('energy_resource_type_id'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0, decimal_digits: '1,4' })
    .withMessage('Price must be a non-negative decimal number with up to 4 decimal places'),

  validateDate('valid_from', body, false, true),
  validateValidToDate(),
];

const updateTariffValidation = [
  param('id').isInt({ min: 1 }).withMessage('Tariff ID must be a positive integer'),

  validatePositiveInt('location_id', body, true),
  validatePositiveInt('energy_resource_type_id', body, true),

  body('price')
    .optional()
    .isFloat({ min: 0, decimal_digits: '1,4' })
    .withMessage('Price must be a non-negative decimal number with up to 4 decimal places'),

  validateDate('valid_from', body, true), 
  
  validateValidToDate(), 
];

const getTariffByIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Tariff ID must be a positive integer')
];

const getTariffsQueryValidation = [
  validatePositiveInt('location_id', query, true),
  validatePositiveInt('energy_resource_type_id', query, true),
  validateDate('valid_from', query, true),
  validateDate('valid_to', query, true),
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
  createTariffValidation,
  updateTariffValidation,
  getTariffByIdValidation,
  getTariffsQueryValidation,
  handleValidationErrors,
};