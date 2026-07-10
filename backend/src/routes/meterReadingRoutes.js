const express = require('express');
const router = express.Router();
const meterReadingController = require('../controllers/meterReadingController');
const {
  createMeterReadingValidation,
  updateMeterReadingValidation,
  getMeterReadingByIdValidation,
  getMeterReadingsQueryValidation,
  handleValidationErrors,
} = require('../middlewares/meterReadingValidation');
const { checkJwt, checkRole, logAuth } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         address:
 *           type: string
 *     Tenant:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         location:
 *           $ref: '#/components/schemas/Location'
 *     Meter:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         serial_number:
 *           type: string
 *         location_id:
 *           type: integer
 *         energy_resource_type_id:
 *           type: integer
 *         meter_type:
 *           type: string
 *     MeterTenant:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         tenant:
 *           $ref: '#/components/schemas/Tenant'
 *         meter:
 *           $ref: '#/components/schemas/Meter'
 *     MeterReading:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         meter_tenant_id:
 *           type: integer
 *         reading_date:
 *           type: string
 *           format: date
 *           example: "2025-01-15"
 *         current_reading:
 *           type: number
 *           format: decimal
 *           example: 1500.5000
 *         previous_reading:
 *           type: number
 *           format: decimal
 *           example: 1450.2000
 *         consumption:
 *           type: number
 *           format: decimal
 *           example: 50.3000
 *         unit_price:
 *           type: number
 *           format: decimal
 *           example: 2.5000
 *         direct_consumption:
 *           type: number
 *           format: decimal
 *           example: 45.0000
 *         area_based_consumption:
 *           type: number
 *           format: decimal
 *           example: 5.3000
 *         total_consumption:
 *           type: number
 *           format: decimal
 *           example: 50.3000
 *         total_cost:
 *           type: number
 *           format: decimal
 *           example: 125.75
 *         calculation_method:
 *           type: string
 *           enum: [direct, area_based, mixed]
 *           example: "mixed"
 *         rental_area:
 *           type: number
 *           format: decimal
 *           example: 852.00
 *           description: "Орендована площа у кв.м"
 *         total_rented_area_percentage:
 *           type: number
 *           format: decimal
 *           example: 1.31
 *           description: "Відсоток орендованої площі"
 *         energy_consumption_coefficient:
 *           type: number
 *           format: decimal
 *           example: 1.0000
 *           description: "Коефіцієнт споживання електроенергії"
 *         calculation_coefficient:
 *           type: number
 *           format: decimal
 *           example: 1.0000
 *           description: "Розрахунковий коефіцієнт"
 *         executor_name:
 *           type: string
 *           example: "Іванов І.П."
 *           description: "Виконавець (хто знімав показання)"
 *         tenant_representative:
 *           type: string
 *           example: "Петров П.П."
 *           description: "Представник орендаря"
 *         notes:
 *           type: string
 *           example: "Додаткові примітки"
 *           description: "Примітки"
 *         act_number:
 *           type: string
 *           example: "АКТ-2025-001"
 *           description: "Номер акту"
 *         created_at:
 *           type: string
 *           format: date-time
 *         created_by:
 *           type: integer
 *         meterTenant:
 *           $ref: '#/components/schemas/MeterTenant'
 *     MeterReadingInput:
 *       type: object
 *       required:
 *         - meter_tenant_id
 *         - reading_date
 *         - calculation_method
 *       properties:
 *         meter_tenant_id:
 *           type: integer
 *           example: 1
 *         reading_date:
 *           type: string
 *           format: date
 *           example: "2025-01-15"
 *         current_reading:
 *           type: number
 *           format: decimal
 *           example: 1500.5000
 *         previous_reading:
 *           type: number
 *           format: decimal
 *           example: 1450.2000
 *         area_based_consumption:
 *           type: number
 *           format: decimal
 *           example: 5.3000
 *         calculation_method:
 *           type: string
 *           enum: [direct, area_based, mixed]
 *           example: "mixed"
 *         rental_area:
 *           type: number
 *           format: decimal
 *           example: 852.00
 *         total_rented_area_percentage:
 *           type: number
 *           format: decimal
 *           example: 1.31
 *         energy_consumption_coefficient:
 *           type: number
 *           format: decimal
 *           example: 1.0000
 *         calculation_coefficient:
 *           type: number
 *           format: decimal
 *           example: 1.0000
 *         executor_name:
 *           type: string
 *           example: "Іванов І.П."
 *         tenant_representative:
 *           type: string
 *           example: "Петров П.П."
 *         notes:
 *           type: string
 *           example: "Додаткові примітки"
 *         act_number:
 *           type: string
 *           example: "АКТ-2025-001"
 *     ActGeneration:
 *       type: object
 *       required:
 *         - reading_ids
 *       properties:
 *         reading_ids:
 *           type: array
 *           items:
 *             type: integer
 *           example: [1, 2, 3]
 *         act_number:
 *           type: string
 *           example: "АКТ-2025-001"
 *         act_date:
 *           type: string
 *           format: date
 *           example: "2025-02-28"
 *         executor_name:
 *           type: string
 *           example: "Іванов І.П."
 *         tenant_representative:
 *           type: string
 *           example: "Петров П.П."
 */

/**
 * @swagger
 * /api/meter-readings:
 *   get:
 *     tags: [MeterReadings]
 *     summary: Отримати список показань лічильників
 *     parameters:
 *       - name: meter_tenant_id
 *         in: query
 *         description: ID зв'язки лічильник-орендар
 *         schema:
 *           type: integer
 *       - name: reading_date
 *         in: query
 *         description: Дата показання
 *         schema:
 *           type: string
 *           format: date
 *       - name: executor_name
 *         in: query
 *         description: Ім'я виконавця
 *         schema:
 *           type: string
 *       - name: act_number
 *         in: query
 *         description: Номер акту
 *         schema:
 *           type: string
 *       - name: calculation_method
 *         in: query
 *         description: Метод розрахунку
 *         schema:
 *           type: string
 *           enum: [direct, area_based, mixed]
 *     responses:
 *       200:
 *         description: Список показань лічильників
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MeterReading'
 */
router.get(
  '/',
  checkJwt,
  getMeterReadingsQueryValidation,
  handleValidationErrors,
  meterReadingController.getAllReadings
);
router.get('/summary',checkJwt,checkRole('admin'), meterReadingController.getReadingsSummary);

/**
 * @swagger
 * /api/meter-readings/{id}:
 *   get:
 *     tags: [MeterReadings]
 *     summary: Отримати показання лічильника за ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID показання лічільника
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Показання лічильника
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeterReading'
 *       404:
 *         description: Не знайдено
 */
router.get(
  '/:id',
  checkJwt,
  getMeterReadingByIdValidation,
  handleValidationErrors,
  meterReadingController.getReadingById
);

/**
 * @swagger
 * /api/meter-readings:
 *   post:
 *     tags: [MeterReadings]
 *     summary: Створити нове показання лічільника
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MeterReadingInput'
 *     responses:
 *       201:
 *         description: Показання створено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeterReading'
 *       400:
 *         description: Помилка валідації
 *       403:
 *         description: Недостатньо прав доступу
 */
router.post(
  '/',
  checkJwt,
  logAuth,
  checkRole('admin'),
  createMeterReadingValidation,
  handleValidationErrors,
  meterReadingController.createReading
);

/**
 * @swagger
 * /api/meter-readings/{id}:
 *   put:
 *     tags: [MeterReadings]
 *     summary: Оновити показання лічільника
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID показання лічільника
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MeterReadingInput'
 *     responses:
 *       200:
 *         description: Показання оновлено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeterReading'
 *       400:
 *         description: Помилка валідації
 *       403:
 *         description: Недостатньо прав доступу
 *       404:
 *         description: Не знайдено
 */
router.put(
  '/:id',
  checkJwt,
  checkRole('admin'),
  updateMeterReadingValidation,
  handleValidationErrors,
  meterReadingController.updateReading
);

/**
 * @swagger
 * /api/meter-readings/{id}:
 *   delete:
 *     summary: Видалити показання лічільника
 *     tags: [MeterReadings]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID показання лічільника
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Показання видалено
 *       403:
 *         description: Недостатньо прав доступу
 *       404:
 *         description: Не знайдено
 */
router.delete(
  '/:id',
  checkJwt,
  checkRole('admin'),
  getMeterReadingByIdValidation,
  handleValidationErrors,
  meterReadingController.deleteReading
);

/**
 * @swagger
 * /api/meter-readings/generate-act:
 *   post:
 *     tags: [MeterReadings]
 *     summary: Згенерувати акт звірки показників
 *     description: Створює акт звірки на основі вказаних показань лічільників
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActGeneration'
 *     responses:
 *       200:
 *         description: Акт згенеровано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 act_number:
 *                   type: string
 *                 act_date:
 *                   type: string
 *                   format: date
 *                 readings:
 *                   type: object
 *                   description: Показання згруповані за типом енергоресурсу
 *                 summary:
 *                   type: object
 *                   description: Підсумкова інформація за типами ресурсів
 *                 executor:
 *                   type: string
 *                 tenant_representative:
 *                   type: string
 *       400:
 *         description: Помилка валідації
 *       403:
 *         description: Недостатньо прав доступу
 */
/*router.post(
  '/generate-act',
  checkJwt,
  checkRole('admin'),
  generateActValidation,
  handleValidationErrors,
  meterReadingController.generateAct
);*/



module.exports = router;
