const { MeterReading, MeterTenant, Meter, Tenant, User, Location, EnergyResourceType, MeterReadingDistribution } = require('../../models');
const { Op } = require('sequelize');
const ConsumptionCalculator = require('../utils/consumptionCalculator');
const tariffService = require('./tariffService');
const withTransaction = require('../utils/withTransaction');

// Пов'язані дані, які підтягуються разом із показанням
const READING_INCLUDES = [
  {
    model: MeterTenant,
    as: 'MeterTenant',
    attributes: ['id', 'tenant_id', 'meter_id'],
    include: [
      {
        model: Meter,
        as: 'Meter',
        attributes: ['id', 'serial_number', 'location_id', 'energy_resource_type_id'],
        include: [
          { model: EnergyResourceType, as: 'EnergyResourceType', attributes: ['id', 'name'] },
          { model: Location, as: 'Location', attributes: ['id', 'name', 'address', 'occupied_area'] },
        ],
      },
      { model: Tenant, as: 'Tenant', attributes: ['id', 'name'] },
    ],
  },
  { model: User, as: 'User', attributes: ['id', 'full_name'] },
  { model: MeterReadingDistribution, as: 'distributions' },
];

// Лічильник прив'язки разом із площею локації — потрібен для розрахунку
const METER_WITH_LOCATION_INCLUDE = [
  {
    model: Meter,
    as: 'Meter',
    include: [{ model: Location, as: 'Location', attributes: ['occupied_area'] }],
  },
];

function calculateByMethod(method, { consumption, area, calculationCoeff, energyCoeff }) {
  // ВАДА (див. тести [поточна поведінка] у meterReadingService.test.js):
  // ConsumptionCalculator очікує ВІДСОТОК (ділить на 100), а сюди передається площа локації в м².
  // Правильну формулу треба узгодити — після рішення змінити лише цей рядок
  const areaPercent = area;
 
  switch (method) {
    case 'direct':
      return ConsumptionCalculator.calculateDirect(consumption, calculationCoeff, areaPercent);
    case 'area_based':
      return ConsumptionCalculator.calculateAreaBased(area, energyCoeff, areaPercent);
    case 'mixed':
      return ConsumptionCalculator.calculateMixed(
        consumption,
        area,
        calculationCoeff,
        energyCoeff,
        areaPercent
      );
    default:
      return null;
  }
}

function getLocationArea(meterTenant) {
  return parseFloat(meterTenant.Meter.Location?.occupied_area) || 0;
}

class MeterReadingService {
  async getAllLocations() {
    return await Location.findAll({
      attributes: ['id', 'name', 'address', 'occupied_area'],
      order: [['name', 'ASC']],
    });
  }

  async getAllReadings(filters = {}) {
    const where = {};

    if (filters.meter_tenant_id) {
      where.meter_tenant_id = filters.meter_tenant_id;
    }
    if (filters.reading_date) {
      where.reading_date = filters.reading_date;
    }
    if (filters.executor_name) {
      where.executor_name = { [Op.iLike]: `%${filters.executor_name}%` };
    }
    if (filters.act_number) {
      where.act_number = { [Op.iLike]: `%${filters.act_number}%` };
    }
    if (filters.calculation_method) {
      where.calculation_method = filters.calculation_method;
    }
    try {
    const readings = await MeterReading.findAll({
      where,
      include: READING_INCLUDES,
      order: [['created_at', 'DESC']],
      raw: false,
    });
    const meterTenants = await MeterTenant.findAll({
      include: [
          {
            model: Meter,
            as: 'Meter',
            attributes: ['id', 'location_id'],
            include: [{ model: Location, as: 'Location', attributes: ['id', 'occupied_area'] }],
          },
        ],
      raw: true,
    });

    // Calculate total area from unique locations (avoiding duplicates)
    const uniqueLocations = new Map();
    meterTenants.forEach((mt) => {
      // When raw: true, nested properties use dot notation in the property name
      const locationId = mt['Meter.Location.id'];
      const area = parseFloat(mt['Meter.Location.occupied_area'] || 0);
      if (locationId && !uniqueLocations.has(locationId)) {
        uniqueLocations.set(locationId, area);
      }
    });

    const totalRentedArea = Array.from(uniqueLocations.values()).reduce((sum, area) => sum + area, 0);

  return readings.map((reading) => {
    const plainReading = reading.get({ plain: true });
      const location = plainReading.MeterTenant?.Meter?.Location;
      const tenantArea = parseFloat(location?.occupied_area || 0);
      const areaPercentage = totalRentedArea > 0 ? (tenantArea / totalRentedArea) * 100 : 0;


        return {
          ...plainReading,
          tenant_occupied_area: tenantArea,
          location_occupied_area: parseFloat(location?.occupied_area) || 0,
          total_rented_area: totalRentedArea,
          area_percentage: areaPercentage,
          address: location?.address,
          location_name: location?.name,
        };
      });
    } catch (error) {
      console.error('Error in getAllReadings:', error);
      throw error;
    }
  }

  async getReadingById(id) {
    const reading = await MeterReading.findByPk(id, { include: READING_INCLUDES });

    if (!reading) {
      throw new Error('Meter reading not found');
    }
    return reading;
  }

  async createReading(data) { 
    const {
      meter_tenant_id,
      reading_date,
      current_reading,
      previous_reading,
      calculation_method,
      executor_name,
      tenant_representative,
      created_by,
      rental_area,
      total_rented_area_percentage = 0,
      energy_consumption_coefficient = 1,
      calculation_coefficient = 1,
      notes,
      act_number,
      distributions = [], 
    } = data;
  
    let finalPreviousReading = previous_reading;
  
    if (finalPreviousReading === null || finalPreviousReading === undefined) {
  
      const previousReadingRecord = await MeterReading.findOne({
        where: {
          meter_tenant_id,
          reading_date: { [Op.lt]: new Date(reading_date) },
        },
        order: [['reading_date', 'DESC']],
      });
      finalPreviousReading = previousReadingRecord? previousReadingRecord.current_reading: 0;
    }
  
    const consumption = ConsumptionCalculator.calculateConsumption(current_reading,finalPreviousReading);

    const meterTenant = await MeterTenant.findByPk(meter_tenant_id, {
      include: METER_WITH_LOCATION_INCLUDE,
    });

    if (!meterTenant) throw new Error('Meter tenant not found');
    if (!meterTenant.Meter) throw new Error('Meter not linked to this tenant');
  
    const tariff = await tariffService.getApplicableTariff(
      meterTenant.Meter.location_id,
      meterTenant.Meter.energy_resource_type_id,
      reading_date
    );

    const area = getLocationArea(meterTenant);

    const result = calculateByMethod(calculation_method, {
      consumption,
      area,
      calculationCoeff: calculation_coefficient,
      energyCoeff: energy_consumption_coefficient,
    });
    if (!result) throw new Error('Unknown calculation method');

    const { direct_consumption, area_based_consumption, total_consumption } = result;
  
    let total_cost = 0;

    const distributionRecords = distributions.map((d) => {
      const difference = ConsumptionCalculator.calculateConsumption(
        d.current_reading,
        d.previous_reading
      );
    
      const method = d.calculation_method || calculation_method;
      const distCoeff = d.calculation_coefficient ?? calculation_coefficient;
      const distEnergyCoeff = d.energy_consumption_coefficient ?? energy_consumption_coefficient;

      const consumedEnergy =
        calculateByMethod(method, {
          consumption: difference,
          area,
          calculationCoeff: distCoeff,
          energyCoeff: distEnergyCoeff,
        })?.total_consumption ?? 0;
    
      const cost = ConsumptionCalculator.calculateTotalCost(consumedEnergy, tariff.price);
      total_cost += parseFloat(cost) || 0;
    
      return {
        category: d.category,
        current_reading: d.current_reading,
        previous_reading: d.previous_reading,
        difference,
        calculation_method: method,
        calculation_coefficient: distCoeff,
        energy_consumption_coefficient: distEnergyCoeff,
        area_percentage: area, 
        consumed_energy: consumedEnergy.toFixed(2),
        cost: cost.toFixed(2),
      };
    });
    
    if (distributionRecords.length === 0) {
      total_cost = ConsumptionCalculator.calculateTotalCost(total_consumption, tariff.price);
    }

   
        // Показання і його категорії — в одній транзакції
    return withTransaction(null, async (transaction) => {
      const reading = await MeterReading.create(
        {
          meter_tenant_id,
          reading_date,
          current_reading,
          previous_reading: finalPreviousReading,
          consumption,
          unit_price: tariff.price,
          direct_consumption,
          area_based_consumption:area_based_consumption,
          total_consumption,
          total_cost: total_cost.toFixed(2),
          calculation_method,
          executor_name,
          tenant_representative,
          created_by,
          rental_area,
          total_rented_area_percentage,
          energy_consumption_coefficient,
          calculation_coefficient,
          notes,
          act_number,
        },
        { transaction }
      );

      if (distributionRecords.length > 0) {
        const recordsWithId = distributionRecords.map((d) => ({...d, meter_reading_id: reading.id,}));
        await MeterReadingDistribution.bulkCreate(recordsWithId, { transaction });
      }

      return reading;
    });
  }
  
  async updateReading(id, updateData) {
    const reading = await this.getReadingById(id);
 
    // Перерахунок, заміна категорій і оновлення показання — в одній транзакції
    return withTransaction(null, async (transaction) => {
      const needsRecalculation =
        updateData.current_reading ||
        updateData.calculation_method ||
        updateData.previous_reading ||
        updateData.direct_consumption ||
        updateData.area_based_consumption ||
        updateData.reading_date ||
        updateData.calculation_coefficient ||
        updateData.energy_consumption_coefficient ||
        updateData.distributions;
 
      if (needsRecalculation) {
        let previousReading = updateData.previous_reading ?? reading.previous_reading;
 
        if (!previousReading && (updateData.current_reading || updateData.reading_date)) {
          const previousReadingRecord = await MeterReading.findOne({
            where: {
              meter_tenant_id: reading.meter_tenant_id,
              reading_date: { [Op.lt]: updateData.reading_date || reading.reading_date },
            },
            order: [['reading_date', 'DESC']],
          });
          previousReading = previousReadingRecord ? previousReadingRecord.current_reading : 0;
        }
 
        const consumption = ConsumptionCalculator.calculateConsumption(
          updateData.current_reading ?? reading.current_reading,
          previousReading
        );
 
        const meterTenant = await MeterTenant.findByPk(reading.meter_tenant_id, {
          include: METER_WITH_LOCATION_INCLUDE,
        });
 
        if (!meterTenant?.Meter) throw new Error('Meter not linked to this tenant');
 
        // getApplicableTariff сам кидає помилку, якщо тарифу на дату немає
        const tariff = await tariffService.getApplicableTariff(
          meterTenant.Meter.location_id,
          meterTenant.Meter.energy_resource_type_id,
          updateData.reading_date || reading.reading_date
        );
 
        const price = parseFloat(tariff?.price ?? 0);
        const calculationCoeff = updateData.calculation_coefficient ?? reading.calculation_coefficient ?? 1;
        const energyCoeff =
          updateData.energy_consumption_coefficient ?? reading.energy_consumption_coefficient ?? 1;
        // Перераховуємо за НОВИМ методом, якщо його змінюють, інакше — за збереженим
        const calculationMethod = updateData.calculation_method ?? reading.calculation_method;
        const area = getLocationArea(meterTenant);
 
        let total_cost = 0;
 
        if (updateData.distributions) {
          await MeterReadingDistribution.destroy({ where: { meter_reading_id: id }, transaction });
 
          const newDistributions = updateData.distributions.map((d) => {
            const difference = ConsumptionCalculator.calculateConsumption(d.current_reading, d.previous_reading);
 
            const consumedEnergy =
              calculateByMethod(d.calculation_method || calculationMethod, {
                consumption: difference,
                area,
                calculationCoeff: d.calculation_coefficient ?? calculationCoeff,
                energyCoeff: d.energy_consumption_coefficient ?? energyCoeff,
              })?.total_consumption ?? 0;
 
            const cost = ConsumptionCalculator.calculateTotalCost(consumedEnergy, price);
            total_cost += parseFloat(cost) || 0;
 
            return {
              ...d,
              meter_reading_id: id,
              difference,
              consumed_energy: consumedEnergy.toFixed(2),
              cost: cost.toFixed(2),
              area_percentage: area,
            };
          });
 
          await MeterReadingDistribution.bulkCreate(newDistributions, { transaction });
        }
 
        // Для невідомого методу всі значення лишаються нульовими
        const {
          direct_consumption = 0,
          area_based_consumption = 0,
          total_consumption = 0,
        } = calculateByMethod(calculationMethod, {
          consumption,
          area,
          calculationCoeff,
          energyCoeff,
        }) || {};
 
        // Без категорій вартість рахується від загального споживання
        if (!updateData.distributions || updateData.distributions.length === 0) {
          total_cost = ConsumptionCalculator.calculateTotalCost(total_consumption, price);
        }
 
        updateData = {
          ...updateData,
          previous_reading: previousReading,
          consumption,
          unit_price: price,
          direct_consumption,
          area_based_consumption,
          total_consumption,
          total_cost: total_cost.toFixed(2),
          calculation_coefficient: calculationCoeff,
          energy_consumption_coefficient: energyCoeff,
        };
      }
 
      return reading.update(updateData, { transaction });
    });
  }
  
  
  async deleteReading(id) {
    const reading = await this.getReadingById(id);
    return await reading.destroy();
  }

  async getReadingsSummary(filters = {}) {
    const where = {};

    if (filters.location_id) {
      where['$MeterTenant.Meter.location_id$'] = filters.location_id;
    }
    if (filters.date_from && filters.date_to) {
      where.reading_date = { [Op.between]: [filters.date_from, filters.date_to] };
    }

    const readings = await MeterReading.findAll({
      where,
      include: [
        {
          model: MeterTenant,
          as: 'MeterTenant',
          include: [
            {
              model: Meter,
              as: 'Meter',
              include: [
                { model: EnergyResourceType, as: 'EnergyResourceType', attributes: ['id', 'name'],},
                { model: Location, as: 'Location', attributes: ['id', 'name', 'address', 'occupied_area'],},
              ],
            },
            { model: Tenant, as: 'Tenant', attributes: ['id', 'name'],},
          ],
        },
      ],
      order: [['reading_date', 'ASC']],
    });

    const summary = {};
    readings.forEach((r) => {
      const resourceType = r.MeterTenant?.Meter?.EnergyResourceType?.name || 'Unknown';

      if (!summary[resourceType]) {
        summary[resourceType] = {
          totalConsumption: 0,
          totalCost: 0,
          readings: [],
        };
      }

      summary[resourceType].readings.push({
        tenant: r.MeterTenant?.Tenant?.name,
        meterId: r.MeterTenant?.Meter?.serial_number,
        date: r.reading_date,
        prev: r.previous_reading,
        curr: r.current_reading,
        diff: r.consumption,
        totalConsumption: r.total_consumption,
        totalCost: r.total_cost,
        price: r.unit_price,
      });

      summary[resourceType].totalConsumption += parseFloat(r.total_consumption || 0);
      summary[resourceType].totalCost += parseFloat(r.total_cost || 0);
    });

    return summary;
  }
}

module.exports = new MeterReadingService();