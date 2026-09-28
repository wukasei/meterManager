const ConsumptionCalculator = require('../../utils/consumptionCalculator');

describe('ConsumptionCalculator', () => {
  // ─────────────────────────────────────────────
  describe('calculateConsumption', () => {
    it('повертає саме показання, якщо попереднього немає (перше показання)', () => {
      expect(ConsumptionCalculator.calculateConsumption(120)).toBe(120);
    });

    it('перетворює рядок на число для першого показання', () => {
      expect(ConsumptionCalculator.calculateConsumption('120.5')).toBe(120.5);
    });

    it('рахує різницю між поточним і попереднім показанням', () => {
      expect(ConsumptionCalculator.calculateConsumption(150, 100)).toBe(50);
    });

    it('коректно працює з дробовими числами у вигляді рядків', () => {
      // toBeCloseTo, бо 150.5 - 100.2 у JS дає 50.30000000000001
      expect(ConsumptionCalculator.calculateConsumption('150.5', '100.2')).toBeCloseTo(50.3);
    });

    it('повертає 0, якщо показання не змінилося', () => {
      expect(ConsumptionCalculator.calculateConsumption(100, 100)).toBe(0);
    });

    it('кидає помилку, якщо нове показання менше за попереднє', () => {
      expect(() => ConsumptionCalculator.calculateConsumption(50, 100)).toThrow(
        'consumption cannot be negative'
      );
    });

        it('кидає помилку для нечислового поточного показання', () => {
      expect(() => ConsumptionCalculator.calculateConsumption('abc', 100)).toThrow(
        'Invalid meter reading'
      );
    });

    it('кидає помилку для нечислового першого показання', () => {
      expect(() => ConsumptionCalculator.calculateConsumption('abc')).toThrow(
        'Invalid meter reading'
      );
    });
  });

  // ─────────────────────────────────────────────
  describe('calculateDirect', () => {
    it('з параметрами за замовчуванням повертає споживання без змін', () => {
      expect(ConsumptionCalculator.calculateDirect(100)).toEqual({
        direct_consumption: 100,
        area_based_consumption: 0,
        total_consumption: 100,
      });
    });

    it('множить споживання на коефіцієнт', () => {
      const result = ConsumptionCalculator.calculateDirect(100, 2);
      expect(result.direct_consumption).toBe(200);
      expect(result.total_consumption).toBe(200);
    });

    it('враховує відсоток площі', () => {
      const result = ConsumptionCalculator.calculateDirect(100, 1.5, 50);
      expect(result.total_consumption).toBe(75);
    });
  });

  describe('calculateAreaBased', () => {
    it('з параметрами за замовчуванням повертає значення площі', () => {
      expect(ConsumptionCalculator.calculateAreaBased(60)).toEqual({
        direct_consumption: 0,
        area_based_consumption: 60,
        total_consumption: 60,
      });
    });

    it('враховує енергетичний коефіцієнт і відсоток площі', () => {
      const result = ConsumptionCalculator.calculateAreaBased(60, 2, 50);
      expect(result.area_based_consumption).toBe(60);
      expect(result.total_consumption).toBe(60);
    });
  });

  describe('calculateMixed', () => {
    it('з параметрами за замовчуванням сумує обидві частини', () => {
      expect(ConsumptionCalculator.calculateMixed(100, 50)).toEqual({
        direct_consumption: 100,
        area_based_consumption: 50,
        total_consumption: 150,
      });
    });

    it('застосовує різні коефіцієнти до кожної частини', () => {
      // пряма: 100 * 2 * 0.5 = 100; за площею: 50 * 3 * 0.5 = 75
      expect(ConsumptionCalculator.calculateMixed(100, 50, 2, 3, 50)).toEqual({
        direct_consumption: 100,
        area_based_consumption: 75,
        total_consumption: 175,
      });
    });
  });

  describe('calculateTotalCost', () => {
    it('множить споживання на ціну за одиницю', () => {
      expect(ConsumptionCalculator.calculateTotalCost(100, 2.5)).toBe(250);
    });

    it('працює з рядками', () => {
      expect(ConsumptionCalculator.calculateTotalCost('100', '2.5')).toBe(250);
    });

    it('повертає 0 при нульовому споживанні', () => {
      expect(ConsumptionCalculator.calculateTotalCost(0, 5)).toBe(0);
    });
  });
});