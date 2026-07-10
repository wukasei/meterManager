class ConsumptionCalculator {

  //Різниця між показниками
  static calculateConsumption(currentReading, previousReading = null) {
    if (previousReading === null) {
      return parseFloat(currentReading); // перше показання
    }

    const consumption = parseFloat(currentReading) - parseFloat(previousReading);

    if (consumption < 0) {
      throw new Error(
        "Invalid meter reading: consumption cannot be negative. New reading must be >= previous reading."
      );
    }

    return consumption;
  }

  // Прямий метод — множимо на коефіцієнт
  static calculateDirect(consumption, calculationCoefficient = 1, areaPercentOrSize = 100) {
    const adjusted =
      parseFloat(consumption) *
      parseFloat(calculationCoefficient) *
      (parseFloat(areaPercentOrSize) / 100);
  
    return {
      direct_consumption: adjusted,
      area_based_consumption: 0,
      total_consumption: adjusted,
    };
  }
  
  // Метод "за площею"
  static calculateAreaBased(areaValue, energyCoefficient = 1, areaPercentOrSize = 100) {
    const adjusted =
      parseFloat(areaValue) *
      parseFloat(energyCoefficient) *
      (parseFloat(areaPercentOrSize) / 100);
  
    return {
      direct_consumption: 0,
      area_based_consumption: adjusted,
      total_consumption: adjusted,
    };
  }  

  //Змішаний метод
  static calculateMixed(consumption, areaValue, calcCoeff = 1, energyCoeff = 1, areaPercentOrSize = 100) {
    const directPart =
      parseFloat(consumption) *
      parseFloat(calcCoeff) *
      (parseFloat(areaPercentOrSize) / 100);
  
    const areaPart =
      parseFloat(areaValue) *
      parseFloat(energyCoeff) *
      (parseFloat(areaPercentOrSize) / 100);
  
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

  