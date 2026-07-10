const { body, param, query, validationResult } = require('express-validator');

const validatePositiveInt = (field, location = body) =>
  location(field).isInt({ min: 1 }).withMessage(`${field} must be a positive integer.`);

const validateNonNegativeDecimal = (field, digits = '0,4') =>
  body(field)
    .optional()
    .isDecimal({ decimal_digits: digits })
    .withMessage(`${field} must be a decimal number.`)
    .custom((value) => {
      if (value < 0) throw new Error(`${field} cannot be negative.`);
      return true;
    });

const validatePositiveCoefficient = (field, digits = '0,4') =>
  body(field)
    .optional()
    .isDecimal({ decimal_digits: digits })
    .withMessage(`${field} must be a decimal number with up to ${digits.split(',')[1]} decimal places.`)
    .custom((value) => {
      if (value <= 0) throw new Error(`${field} must be positive (greater than 0).`);
      return true;
    });

const validateCalculationMethod = (isOptional = false) => {
  let chain = body('calculation_method').trim();

  if (!isOptional) {
    chain = chain.notEmpty().withMessage('calculation_method is required');
  } else {
    chain = chain.optional().notEmpty().withMessage('calculation_method cannot be empty');
  }

  return chain
    .isIn(['direct', 'area_based', 'mixed'])
    .withMessage('calculation_method must be one of: direct, area_based, mixed.');
};

const createMeterReadingValidation = [
  validatePositiveInt('meter_tenant_id'),
  body('reading_date').isISO8601().withMessage('reading_date must be a valid date (YYYY-MM-DD)').notEmpty(),

  validateNonNegativeDecimal('current_reading'),
  validateNonNegativeDecimal('previous_reading'),
  validateNonNegativeDecimal('consumption'),
  validateNonNegativeDecimal('total_consumption'),
  validateNonNegativeDecimal('total_cost', '0,2'),
  validateNonNegativeDecimal('direct_consumption'),
  validateNonNegativeDecimal('area_based_consumption'),

  validateCalculationMethod(false),

  validateNonNegativeDecimal('rental_area', '0,2').custom((value) => {
    if (value !== undefined && value < 0) throw new Error('rental_area cannot be negative');
    return true;
  }),

  body('total_rented_area_percentage')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('total_rented_area_percentage must be a decimal number')
    .custom((value) => {
      if (value !== undefined && (value < 0 || value > 100))
        throw new Error('total_rented_area_percentage must be between 0 and 100');
      return true;
    }),

  validatePositiveCoefficient('energy_consumption_coefficient', '0,4'),
  validatePositiveCoefficient('calculation_coefficient', '0,4'),

  body('executor_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('executor_name must not exceed 255 characters'),
  body('tenant_representative')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('tenant_representative must not exceed 255 characters'),
  body('notes').optional().trim().isLength({ max: 5000 }).withMessage('notes must not exceed 5000 characters'),
  body('act_number').optional().trim().isLength({ max: 100 }).withMessage('act_number must not exceed 100 characters'),
];

const updateMeterReadingValidation = [
  validatePositiveInt('id', param),

  validatePositiveInt('meter_tenant_id').optional(),
  body('reading_date').optional().isISO8601().withMessage('reading_date must be a valid date'),

  validateNonNegativeDecimal('current_reading'),
  validateNonNegativeDecimal('previous_reading'),
  validateNonNegativeDecimal('consumption'),
  validateNonNegativeDecimal('total_consumption'),
  validateNonNegativeDecimal('total_cost', '0,2'),
  validateNonNegativeDecimal('direct_consumption'),
  validateNonNegativeDecimal('area_based_consumption'),

  validateCalculationMethod(true),

  validateNonNegativeDecimal('rental_area', '0,2').custom((value) => {
    if (value !== undefined && value < 0) throw new Error('rental_area cannot be negative');
    return true;
  }),

  body('total_rented_area_percentage')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('total_rented_area_percentage must be a decimal number')
    .custom((value) => {
      if (value !== undefined && (value < 0 || value > 100))
        throw new Error('total_rented_area_percentage must be between 0 and 100');
      return true;
    }),

  validatePositiveCoefficient('energy_consumption_coefficient', '0,4'),
  validatePositiveCoefficient('calculation_coefficient', '0,4'),

  body('executor_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('executor_name must not exceed 255 characters'),
  body('tenant_representative')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('tenant_representative must not exceed 255 characters'),
  body('notes').optional().trim().isLength({ max: 5000 }).withMessage('notes must not exceed 5000 characters'),
  body('act_number').optional().trim().isLength({ max: 100 }).withMessage('act_number must not exceed 100 characters'),
];

const getMeterReadingByIdValidation = [validatePositiveInt('id', param)];

const getMeterReadingsQueryValidation = [
  query('meter_tenant_id').optional().isInt({ min: 1 }).withMessage('meter_tenant_id must be a positive integer'),
  query('reading_date').optional().isISO8601().withMessage('reading_date must be a valid date'),
  query('executor_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('executor_name must be between 1 and 255 characters'),
  query('act_number')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('act_number must be between 1 and 100 characters'),
  query('calculation_method')
    .optional()
    .isIn(['direct', 'area_based', 'mixed'])
    .withMessage('calculation_method must be one of: direct, area_based, mixed'),
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
  createMeterReadingValidation,
  updateMeterReadingValidation,
  getMeterReadingByIdValidation,
  getMeterReadingsQueryValidation,
  handleValidationErrors,
};
