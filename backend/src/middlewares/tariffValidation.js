const { body, param, query } = require('express-validator');
const handleValidationErrors = require('./handleValidationErrors');

const PRICE_MESSAGE = 'Price must be a non-negative decimal number with up to 4 decimal places';

const validateIdParam = () =>
  param('id').isInt({ min: 1 }).withMessage('Tariff ID must be a positive integer');

const validatePositiveInt = (field, location = body, isOptional = false) => {
  let chain = location(field);
  if (isOptional) chain = chain.optional();
  return chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);
}

const validateDate = (field, location = body, isOptional = false, isRequired = false) => {
    let chain = location(field);
    if (isRequired) chain = chain.notEmpty().withMessage(`${field} is required`).bail();
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

  // isFloat перевіряє, що це невід'ємне число,
  // isDecimal — кількість знаків після коми (isFloat опцію decimal_digits не підтримує)  
  const validatePrice = (isOptional = false) => {
  let chain = body('price');
 
  if (isOptional) {
    chain = chain.optional();
  } else {
    chain = chain.notEmpty().withMessage('Price is required').bail();
  }
 
  return chain
    .isFloat({ min: 0 })
    .withMessage(PRICE_MESSAGE)
    .bail()
    .isDecimal({ decimal_digits: '1,4' })
    .withMessage(PRICE_MESSAGE);
};

const createTariffValidation = [
  validatePositiveInt('location_id'),
  validatePositiveInt('energy_resource_type_id'),
  validatePrice(false),
  validateDate('valid_from', body, false, true),
  validateValidToDate(),
];

const updateTariffValidation = [
  validateIdParam(),
  validatePositiveInt('location_id', body, true),
  validatePositiveInt('energy_resource_type_id', body, true),
  validatePrice(true),
  validateDate('valid_from', body, true),
  validateValidToDate(),
];

const getTariffByIdValidation = [validateIdParam()];

const getTariffsQueryValidation = [
  validatePositiveInt('location_id', query, true),
  validatePositiveInt('energy_resource_type_id', query, true),
  validateDate('valid_from', query, true),
  validateDate('valid_to', query, true),
];

module.exports = {
  createTariffValidation,
  updateTariffValidation,
  getTariffByIdValidation,
  getTariffsQueryValidation,
  handleValidationErrors,
};