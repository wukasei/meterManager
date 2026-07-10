import ExcelJS from 'exceljs';

export const generateConsumptionAct = async (readings, resourceType, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Акт');

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };

  let currentRow = 1;

  worksheet.getRow(currentRow).values = [
    `Акт фіксації показників та розрахунок споживання ${getResourceGenitive(resourceType)} ${options.tenantCompany || ''} за період з`,
  ];
  worksheet.mergeCells(currentRow, 1, currentRow, 12);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 25;
  currentRow += 3;

  const introText = `${options.organization || 'ТОВ «Про Тек Вікна Україна»'}, в особі ${
    options.executorName || 'головного енергетика'
  }, та\n${options.tenantCompany || 'ТОВ "ГалФрост"'}, в особі ${
    options.tenantRepresentative || 'керуючого'
  }, склали цей акт про наступне:\n1. Сторони цього акту зафіксували показники наступних приладів обліку, які знаходяться в приміщеннях за адресою: ${
    options.address || 'Львівська обл., с. Зимна Вода, вул. Яворівська, 30'
  }:`;

  worksheet.getRow(currentRow).values = [introText];
  worksheet.mergeCells(currentRow, 1, currentRow + 2, 12);
  const introCell = worksheet.getCell(currentRow, 1);
  introCell.font = { size: 10 };
  introCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  worksheet.getRow(currentRow).height = 60;
  currentRow += 4;

  const normalizedResourceType = resourceType.charAt(0).toUpperCase() + resourceType.slice(1).toLowerCase();

  const isWater =
    ['Вода', 'Вода (всі)', 'Холодна вода', 'Гаряча вода'].includes(resourceType) ||
    ['вода', 'вода (всі)', 'холодна вода', 'гаряча вода'].includes(resourceType.toLowerCase());
  const isThermalEnergy = resourceType === 'Газ' || resourceType.toLowerCase() === 'газ';
  const isAllWater =
    resourceType === 'Вода' ||
    resourceType === 'Вода (всі)' ||
    resourceType.toLowerCase() === 'вода' ||
    resourceType.toLowerCase() === 'вода (всі)';
  const isElectricity = !isWater && !isThermalEnergy;

  let headers;
  if (isWater) {
    headers = [
      { text: '№\nп/п', width: 8 },
      { text: 'Тип лічильника\nпо t', width: 15 },
      { text: '№ лічильника', width: 15 },
      { text: 'Місце\nвстановлення', width: 20 },
      { text: 'Попередні\nпоказники,\nкуб. м.', width: 15 },
      { text: 'Поточні\nпоказники,\nкуб. м.', width: 15 },
      { text: 'Спожита\nвода,\nкуб. м.', width: 15 },
    ];
  } else if (isThermalEnergy) {
    headers = [
      { text: '№\nлічильника', width: 12 },
      { text: 'Місце\nвстановлення', width: 20 },
      { text: 'Поточні\nпоказники,\nМВт', width: 12 },
      { text: 'Попередні\nпоказники,\nМВт', width: 12 },
      { text: 'Різниця,\nМВт', width: 10 },
      { text: 'Розрахунковий\nкоефіцієнт,\nз МВт в Гкал', width: 15 },
      { text: 'Спожита\nтеплова енергія,\nГкал', width: 15 },
    ];
  } else {
    headers = [
      { text: '№\nп/п', width: 5 },
      { text: '№ лічильника, місце\nвстановлення', width: 18 },
      { text: "Призначення обліку\n(назва об'єкту)", width: 20 },
      { text: 'СА\nСР\nГР', width: 8 },
      { text: 'Поточні\nпоказники', width: 12 },
      { text: 'Попередні\nпоказники', width: 12 },
      { text: 'Різниця', width: 10 },
      { text: 'Розрахунковий\nкоефіцієнт', width: 12 },
      { text: '% займаної\nплощі', width: 10 },
      { text: `Спожита\n${getResourceName(resourceType)}`, width: 15 },
    ];
  }

  const headerRow = worksheet.getRow(currentRow);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header.text;
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    cell.border = getBorders();
    worksheet.getColumn(index + 1).width = header.width;
  });
  headerRow.height = 35;
  currentRow++;

  if (isWater) {
    const numberRow = worksheet.getRow(currentRow);
    numberRow.values = ['1', '2', '3', '4', '5', '6', '7'];
    numberRow.eachCell((cell) => {
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      cell.border = getBorders();
    });
    numberRow.height = 20;
    currentRow++;
  }

  let totalConsumedCA = 0;
  let totalConsumedCP = 0;
  let totalConsumedGR = 0;
  let totalConsumedSimple = 0;
  let totalConsumedCold = 0;
  let totalConsumedHot = 0;

  readings.forEach((reading, index) => {
    const startRow = currentRow;
    const rawReading = reading.rawReading || reading;
    const coefficient = parseFloat(reading.coefficient?.toString() || '1') || 1;
    const areaPercent = parseFloat(reading.locationArea?.toString() || '100') || 100;

    if (isWater) {
      const distributions = rawReading.distributions || [];
      const mainDist = distributions[0] || {
        current_reading: 0,
        previous_reading: 0,
        difference: 0,
        consumed_energy: 0,
      };

      const previous = parseFloat(mainDist.previous_reading?.toString() || '0') || 0;
      const current = parseFloat(mainDist.current_reading?.toString() || '0') || 0;
      const consumed =
        parseFloat(mainDist.consumed_energy?.toString() || '0') ||
        parseFloat(mainDist.difference?.toString() || '0') ||
        current - previous;

      let waterType = ' ';
      let isColdWater = null;

      if (isAllWater) {
        let typeStr = reading.waterType || reading.type || reading.resourceSubType || reading.purpose || '';

        if (typeof typeStr === 'string') {
          typeStr = typeStr.toLowerCase();

          if (typeStr.includes('гаряч') || typeStr.includes('hot') || typeStr.includes('гар')) {
            waterType = 'гаряча вода';
            isColdWater = false;
          } else if (typeStr.includes('холодн') || typeStr.includes('cold') || typeStr.includes('хол')) {
            waterType = 'холодна вода';
            isColdWater = true;
          } else {
            waterType = 'холодна вода';
            isColdWater = true;
          }
        } else {
          waterType = 'холодна вода';
          isColdWater = true;
        }
      } else if (resourceType === 'Гаряча вода' || resourceType.toLowerCase() === 'гаряча вода') {
        waterType = 'гаряча вода';
        isColdWater = false;
      } else {
        waterType = 'холодна вода';
        isColdWater = true;
      }

      const row = worksheet.getRow(currentRow);
      row.values = [
        `${index + 1}.`,
        waterType,
        reading.meterNumber || '',
        reading.installationPlace || '',
        previous,
        current,
        consumed,
      ];

      row.eachCell((cell, colNum) => {
        cell.border = getBorders();
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: colNum === 4,
        };
        if (colNum >= 5 && colNum <= 7 && cell.value !== '') {
          cell.numFmt = '0.000';
        }
      });
      row.height = 25;
      currentRow++;

      if (isAllWater) {
        if (isColdWater) {
          totalConsumedCold += consumed;
        } else {
          totalConsumedHot += consumed;
        }
      } else {
        totalConsumedSimple += consumed;
      }
    } else if (isThermalEnergy) {
      const distributions = rawReading.distributions || [];
      const mainDist = distributions[0] || {
        current_reading: 0,
        previous_reading: 0,
        difference: 0,
        consumed_energy: 0,
      };

      const current = parseFloat(mainDist.current_reading?.toString() || '0') || 0;
      const previous = parseFloat(mainDist.previous_reading?.toString() || '0') || 0;
      const diff = parseFloat(mainDist.difference?.toString() || '0') || current - previous;
      const consumed = parseFloat(mainDist.consumed_energy?.toString() || '0') || 0;

      const row = worksheet.getRow(currentRow);
      row.values = [
        reading.meterNumber || '',
        reading.installationPlace || '',
        current,
        previous,
        diff,
        coefficient,
        consumed,
      ];

      row.eachCell((cell, colNum) => {
        cell.border = getBorders();
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colNum === 2 };
        if (colNum >= 3 && colNum <= 7 && cell.value !== '') {
          cell.numFmt = '0.000';
        }
      });
      row.height = 25;
      currentRow++;
      totalConsumedSimple += consumed;
    } else {
      const distributions = rawReading.distributions || [];
      const caDistribution = distributions.find((d) => d.category === 'CA');
      const cpDistribution = distributions.find((d) => d.category === 'CP');
      const grDistribution = distributions.find((d) => d.category === 'GR');

      const getDistData = (dist) => {
        if (!dist) return { current: 0, previous: 0, diff: 0, consumed: 0 };
        const current = parseFloat(dist.current_reading?.toString() || '0') || 0;
        const previous = parseFloat(dist.previous_reading?.toString() || '0') || 0;
        let diff = parseFloat(dist.difference?.toString() || '0');
        if (!isFinite(diff)) {
          diff = current - previous;
        }
        let consumed = parseFloat(dist.consumed_energy?.toString() || '0') || 0;
        if (!isFinite(diff)) diff = 0;
        if (!isFinite(consumed)) consumed = 0;
        return { current, previous, diff, consumed };
      };

      const caData = getDistData(caDistribution);
      const cpData = getDistData(cpDistribution);
      const grData = getDistData(grDistribution);

      const rowCA = worksheet.getRow(currentRow);
      rowCA.values = [
        index + 1,
        `${reading.installationPlace || ''}\n${reading.meterNumber || ''}`,
        reading.purpose || '',
        'СА',
        caData.current,
        caData.previous,
        caData.diff,
        coefficient,
        areaPercent,
        caData.consumed,
      ];
      currentRow++;

      const rowCP = worksheet.getRow(currentRow);
      rowCP.values = ['', '', '', 'СР', cpData.current, cpData.previous, cpData.diff, '', '', cpData.consumed];
      currentRow++;

      const rowGR = worksheet.getRow(currentRow);
      rowGR.values = ['', '', '', 'ГР', grData.current, grData.previous, grData.diff, '', '', grData.consumed];
      currentRow++;

      [rowCA, rowCP, rowGR].forEach((row, idx) => {
        row.eachCell((cell, colNum) => {
          cell.border = getBorders();
          cell.alignment = {
            horizontal: idx === 0 && colNum <= 3 ? 'left' : 'center',
            vertical: 'middle',
            wrapText: idx === 0 && (colNum === 2 || colNum === 3),
          };
          if (colNum >= 5 && colNum <= 10 && cell.value !== '') {
            cell.numFmt = '0.000';
          }
        });
        row.height = 20;
      });

      worksheet.mergeCells(startRow, 1, startRow + 2, 1);
      worksheet.mergeCells(startRow, 2, startRow + 2, 2);
      worksheet.mergeCells(startRow, 3, startRow + 2, 3);
      worksheet.mergeCells(startRow, 8, startRow + 2, 8);
      worksheet.mergeCells(startRow, 9, startRow + 2, 9);

      totalConsumedCA += caData.consumed;
      totalConsumedCP += cpData.consumed;
      totalConsumedGR += grData.consumed;
    }
  });

  currentRow++;

  if (isWater) {
    if (isAllWater) {
      worksheet.mergeCells(currentRow, 1, currentRow, 6);
      const coldHeaderCell = worksheet.getCell(currentRow, 1);
      coldHeaderCell.value = 'Всього холодної води:';
      coldHeaderCell.font = { bold: true, size: 11 };
      coldHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
      coldHeaderCell.border = getBorders();

      const coldCell = worksheet.getCell(currentRow, 7);
      coldCell.value = totalConsumedCold;
      coldCell.font = { bold: true, size: 11 };
      coldCell.numFmt = '0.000';
      coldCell.alignment = { horizontal: 'center', vertical: 'middle' };
      coldCell.border = getBorders();
      coldCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      worksheet.getRow(currentRow).height = 25;
      currentRow++;

      worksheet.mergeCells(currentRow, 1, currentRow, 6);
      const hotHeaderCell = worksheet.getCell(currentRow, 1);
      hotHeaderCell.value = 'Всього гарячої води:';
      hotHeaderCell.font = { bold: true, size: 11 };
      hotHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
      hotHeaderCell.border = getBorders();

      const hotCell = worksheet.getCell(currentRow, 7);
      hotCell.value = totalConsumedHot;
      hotCell.font = { bold: true, size: 11 };
      hotCell.numFmt = '0.000';
      hotCell.alignment = { horizontal: 'center', vertical: 'middle' };
      hotCell.border = getBorders();
      hotCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFCE4D6' },
      };
      worksheet.getRow(currentRow).height = 25;
      currentRow++;

      worksheet.mergeCells(currentRow, 1, currentRow, 6);
      const totalHeaderCell = worksheet.getCell(currentRow, 1);
      totalHeaderCell.value = 'Всього води:';
      totalHeaderCell.font = { bold: true, size: 12 };
      totalHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalHeaderCell.border = getBorders();

      const totalCell = worksheet.getCell(currentRow, 7);
      totalCell.value = totalConsumedCold + totalConsumedHot;
      totalCell.font = { bold: true, size: 12 };
      totalCell.numFmt = '0.000';
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalCell.border = getBorders();
      totalCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' },
      };
      worksheet.getRow(currentRow).height = 25;
      currentRow++;
    } else {
      worksheet.mergeCells(currentRow, 1, currentRow, 6);
      const totalHeaderCell = worksheet.getCell(currentRow, 1);
      totalHeaderCell.value = 'Всього:';
      totalHeaderCell.font = { bold: true, size: 11 };
      totalHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalHeaderCell.border = getBorders();

      const totalCell = worksheet.getCell(currentRow, 7);
      totalCell.value = totalConsumedSimple;
      totalCell.font = { bold: true, size: 11 };
      totalCell.numFmt = '0.000';
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalCell.border = getBorders();
      totalCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' },
      };
      worksheet.getRow(currentRow).height = 25;
      currentRow++;
    }
  } else if (isThermalEnergy) {
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    const totalHeaderCell = worksheet.getCell(currentRow, 1);
    totalHeaderCell.value = `Загальна спожита теплова енергія ${options.tenantCompany || 'орендаря'}, Гкал`;
    totalHeaderCell.font = { bold: true, size: 11 };
    totalHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    totalHeaderCell.border = getBorders();

    const totalCell = worksheet.getCell(currentRow, 7);
    totalCell.value = totalConsumedSimple;
    totalCell.font = { bold: true, size: 11 };
    totalCell.numFmt = '0.000';
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = getBorders();
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' },
    };
    currentRow++;
  } else {
    worksheet.mergeCells(currentRow, 1, currentRow, 10);
    const totalHeaderCell = worksheet.getCell(currentRow, 1);
    totalHeaderCell.value = `Загальна спожита потужність ${options.tenantCompany || 'орендаря'}, ${getResourceUnit(resourceType)}`;
    totalHeaderCell.font = { bold: true, size: 11 };
    totalHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    totalHeaderCell.border = getBorders();
    currentRow++;

    const totalRowCA = worksheet.getRow(currentRow);
    totalRowCA.values = ['', 'СА', '', '', '', '', '', '', '', totalConsumedCA];
    totalRowCA.getCell(2).font = { bold: true };
    totalRowCA.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRowCA.getCell(2).border = getBorders();
    totalRowCA.getCell(10).font = { bold: true, size: 11 };
    totalRowCA.getCell(10).numFmt = '0.000';
    totalRowCA.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRowCA.getCell(10).border = getBorders();
    totalRowCA.getCell(10).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' },
    };
    worksheet.mergeCells(currentRow, 1, currentRow, 1);
    worksheet.mergeCells(currentRow, 3, currentRow, 9);
    currentRow++;

    const totalRowCP = worksheet.getRow(currentRow);
    totalRowCP.values = ['', 'СР', '', '', '', '', '', '', '', totalConsumedCP];
    totalRowCP.getCell(2).font = { bold: true };
    totalRowCP.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRowCP.getCell(2).border = getBorders();
    totalRowCP.getCell(10).font = { bold: true, size: 11 };
    totalRowCP.getCell(10).numFmt = '0.000';
    totalRowCP.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRowCP.getCell(10).border = getBorders();
    totalRowCP.getCell(10).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' },
    };
    worksheet.mergeCells(currentRow, 1, currentRow, 1);
    worksheet.mergeCells(currentRow, 3, currentRow, 9);
    currentRow++;

    const totalRowGR = worksheet.getRow(currentRow);
    totalRowGR.values = ['', 'ГР', '', '', '', '', '', '', '', totalConsumedGR];
    totalRowGR.getCell(2).font = { bold: true };
    totalRowGR.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRowGR.getCell(2).border = getBorders();
    totalRowGR.getCell(10).font = { bold: true, size: 11 };
    totalRowGR.getCell(10).numFmt = '0.000';
    totalRowGR.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRowGR.getCell(10).border = getBorders();
    totalRowGR.getCell(10).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' },
    };
    worksheet.mergeCells(currentRow, 1, currentRow, 1);
    worksheet.mergeCells(currentRow, 3, currentRow, 9);
  }

  currentRow += 3;

  worksheet.getRow(currentRow).values = [
    '2. Сторони підтверджують правильність вказаних приладів обліку і їх показників, та не мають жодних заперечень до цього акту.',
  ];
  worksheet.mergeCells(currentRow, 1, currentRow, 12);
  const noteCell = worksheet.getCell(currentRow, 1);
  noteCell.font = { size: 10 };
  noteCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  worksheet.getRow(currentRow).height = 25;
  currentRow++;

  worksheet.getRow(currentRow).values = ['3. Підписи сторін:'];
  worksheet.mergeCells(currentRow, 1, currentRow, 12);
  worksheet.getCell(currentRow, 1).font = { size: 10, bold: true };
  worksheet.getCell(currentRow, 1).alignment = { horizontal: 'left', vertical: 'middle' };
  currentRow += 2;

  const orgRow = worksheet.getRow(currentRow);
  orgRow.values = [
    options.organization || 'ТОВ «Про Тек Вікна Україна»',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    options.executorName || '',
  ];
  worksheet.mergeCells(currentRow, 1, currentRow, 8);
  worksheet.mergeCells(currentRow, 9, currentRow, 12);
  orgRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  orgRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
  orgRow.height = 20;
  currentRow += 3;

  const tenantRow = worksheet.getRow(currentRow);
  tenantRow.values = [
    options.tenantCompany || 'ТОВ «ГалФрост»',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    options.tenantRepresentative || '',
  ];
  worksheet.mergeCells(currentRow, 1, currentRow, 8);
  worksheet.mergeCells(currentRow, 9, currentRow, 12);
  tenantRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  tenantRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
  tenantRow.height = 20;
  currentRow += 4;

  const execRow = worksheet.getRow(currentRow);
  execRow.values = [
    `Виконав: ${options.executorTitle || 'інж.-енергетик'}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    options.executorName || '',
  ];
  worksheet.mergeCells(currentRow, 1, currentRow, 8);
  worksheet.mergeCells(currentRow, 9, currentRow, 12);
  execRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  execRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const date = new Date(options.period || new Date());
  const resourceForFileName = resourceType.replace(/\s+/g, '_');
  const fileName = `Акт_${resourceForFileName}_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}.xlsx`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);

  return { success: true, fileName };
};

function getBorders() {
  return {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
}

function getResourceGenitive(resourceType) {
  const map = {
    Електроенергія: 'електроенергії',
    Вода: 'гарячої і холодної води',
    'Вода (всі)': 'гарячої і холодної води',
    'Холодна вода': 'холодної води',
    'Гаряча вода': 'гарячої води',
    Газ: 'теплової енергії',
  };
  return map[resourceType] || 'ресурсів';
}

function getResourceName(resourceType) {
  const map = {
    Електроенергія: 'електроенергія',
    Вода: 'вода',
    'Вода (всі)': 'вода',
    'Холодна вода': 'холодна вода',
    'Гаряча вода': 'гаряча вода',
    Газ: 'теплова енергія',
  };
  return map[resourceType] || 'ресурс';
}

function getResourceUnit(resourceType) {
  const map = {
    Електроенергія: 'кВт·год',
    Вода: 'м³',
    'Вода (всі)': 'м³',
    'Холодна вода': 'м³',
    'Гаряча вода': 'м³',
    Газ: 'Гкал',
  };
  return map[resourceType] || 'од.';
}
