
function applyCoefficient(value, coefficient, areaPercentOrSize){
  return parseFloat(value) * parseFloat(coefficient) * (parseFloat(areaPercentOrSize)/100);
}

class ConsumptionCalculator {

  //Різниця між показниками
  static calculateConsumption(currentReading, previousReading = null) {
    const current = parseFloat(currentReading);

    if (Number.isNaN(current)) {
      throw new Error('Invalid meter reading: reading must be a number.');
    }

    if (previousReading === null) {
      return current;
    }

    const consumption = current - parseFloat(previousReading);

    if (consumption < 0) {
      throw new Error(
        "Invalid meter reading: consumption cannot be negative. New reading must be >= previous reading."
      );
    }

    return consumption;
  }

  // Прямий метод — множимо на коефіцієнт
  static calculateDirect(consumption, calculationCoefficient = 1, areaPercentOrSize = 100) {
    const adjusted = applyCoefficient(consumption, calculationCoefficient, areaPercentOrSize);

    return {
      direct_consumption: adjusted,
      area_based_consumption: 0,
      total_consumption: adjusted,
    };
  }
  
  // Метод "за площею"
  static calculateAreaBased(areaValue, energyCoefficient = 1, areaPercentOrSize = 100) {
    const adjusted = applyCoefficient(areaValue, energyCoefficient, areaPercentOrSize);
  
    return {
      direct_consumption: 0,
      area_based_consumption: adjusted,
      total_consumption: adjusted,
    };
  }  

  //Змішаний метод
  static calculateMixed(consumption, areaValue, calcCoeff = 1, energyCoeff = 1, areaPercentOrSize = 100) {
    const directPart = applyCoefficient(consumption, calcCoeff, areaPercentOrSize);
    const areaPart = applyCoefficient(areaValue, energyCoeff, areaPercentOrSize);
  
    const total = directPart + areaPart;
  
    return {
      direct_consumption: directPart,
      area_based_consumption: areaPart,
      total_consumption: total,
    };
  }  

  //Розрахунок total cost
  static calculateTotalCost(totalConsumption, unitPrice) {
    return parseFloat(totalConsumption) * parseFloat(unitPrice);
  }
}

module.exports = ConsumptionCalculator;

  