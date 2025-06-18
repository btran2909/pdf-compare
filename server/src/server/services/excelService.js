const ExcelJS = require('exceljs');
const { comparePDFs } = require('./pdfService');

const processExcelFile = async (filePath) => {
  const API_BASE_URL = process.env.API_BASE_URL || 'https://api.kikker.nl/core/api/Invoice/get-pdf-file';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  const results = [];
  let rowNumber = 2; // Skip header row

  while (worksheet.getRow(rowNumber).getCell(1).value || worksheet.getRow(rowNumber).getCell(2).value) {
    const row = worksheet.getRow(rowNumber);
    const oldPdfUrlExcel = row.getCell(1).value;
    const newPdfUrlExcel = row.getCell(2).value;
    if (oldPdfUrlExcel && newPdfUrlExcel) {
      try {
        const oldPdfUrl = `${API_BASE_URL}/${oldPdfUrlExcel}`; // Replace with actual API endpoint
        const newPdfUrl = `${API_BASE_URL}/${newPdfUrlExcel}`;

        const comparisonResult = await comparePDFs(oldPdfUrl, newPdfUrl);
        results.push({
          oldPdfUrl,
          newPdfUrl,
          ...comparisonResult
        });
      } catch (error) {
        results.push({
          oldPdfUrlExcel,
          newPdfUrlExcel,
          error: error.message,
          overallResult: 'Error'
        });
      }
    }
    rowNumber++;
  }

  return results;
};

const generateReport = async (results, outputPath) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Comparison Results');

  // Add headers
  worksheet.columns = [
    { header: 'Old File', key: 'oldFile' },
    { header: 'New File', key: 'newFile' },
    { header: 'Status', key: 'status' },
    { header: 'Time (ms)', key: 'time' },
    { header: 'Details', key: 'details' }
  ];

  // Add data
  results.forEach(result => {
    worksheet.addRow({
      oldFile: result.oldFileName,
      newFile: result.newFileName,
      status: result.overallResult,
      time: result.executionTime,
      details: JSON.stringify(result.results)
    });
  });

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
};

module.exports = { processExcelFile, generateReport }; 