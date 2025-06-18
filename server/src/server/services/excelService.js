const ExcelJS = require('exceljs');
const { comparePDFs } = require('./pdfService');

const processExcelFile = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  const results = [];

  for (const row of worksheet.getRows(2)) { // Skip header row
    const rsUuid = row.getCell(1).value;
    const invoiceUuid = row.getCell(2).value;

    if (!rsUuid || !invoiceUuid) continue;

    try {
      const oldPdfUrl = `https://api.example.com/pdfs/${rsUuid}`; // Replace with actual API endpoint
      const newPdfUrl = `https://api.example.com/pdfs/${invoiceUuid}`;

      const comparisonResult = await comparePDFs(oldPdfUrl, newPdfUrl);
      results.push({
        rsUuid,
        invoiceUuid,
        ...comparisonResult
      });
    } catch (error) {
      results.push({
        rsUuid,
        invoiceUuid,
        error: error.message,
        overallResult: 'Error'
      });
    }
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