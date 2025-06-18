const PDFExtract = require('pdf.js-extract').PDFExtract;
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { diffChars } = require('diff');

const pdfExtract = new PDFExtract();
const fieldsToCompare = ['PV price', 'Reseller earning', 'Different amount', 'Total amount'];
const fieldsThatShouldDiffer = ['Different amount'];

const downloadPDF = async (url, filename) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const filePath = path.join(__dirname, '../../temp', filename);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, response.data);
  return filePath;
};

const extractPDFContent = async (filePath) => {
  const data = await pdfExtract.extract(filePath);
  return data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n');
};

const compareFields = (oldContent, newContent) => {
  const results = {};
  let overallResult = 'Pass';

  for (const field of fieldsToCompare) {
    const oldValue = extractFieldValue(oldContent, field);
    const newValue = extractFieldValue(newContent, field);
    const shouldDiffer = fieldsThatShouldDiffer.includes(field);

    if (shouldDiffer) {
      results[field] = {
        old: oldValue,
        new: newValue,
        result: oldValue !== newValue ? 'Pass' : 'Fail'
      };
    } else {
      results[field] = {
        old: oldValue,
        new: newValue,
        result: oldValue === newValue ? 'Pass' : 'Fail'
      };
    }

    if (results[field].result === 'Fail') {
      overallResult = 'Fail';
    }
  }

  return { results, overallResult };
};

const extractFieldValue = (content, field) => {
  const regex = new RegExp(`${field}:\\s*([\\d,.]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1] : null;
};

const comparePDFs = async (oldPdfUrl, newPdfUrl) => {
  const startTime = Date.now();
  
  try {
    const oldPdfPath = await downloadPDF(oldPdfUrl, 'old.pdf');
    const newPdfPath = await downloadPDF(newPdfUrl, 'new.pdf');

    const oldContent = await extractPDFContent(oldPdfPath);
    const newContent = await extractPDFContent(newPdfPath);

    const comparison = compareFields(oldContent, newContent);
    const executionTime = Date.now() - startTime;

    // Cleanup
    await fs.remove(oldPdfPath);
    await fs.remove(newPdfPath);

    return {
      ...comparison,
      executionTime,
      oldFileName: path.basename(oldPdfUrl),
      newFileName: path.basename(newPdfUrl)
    };
  } catch (error) {
    throw new Error(`PDF comparison failed: ${error.message}`);
  }
};

module.exports = { comparePDFs }; 