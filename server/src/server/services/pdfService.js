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
  const tempDir = path.join(__dirname, '../../temp');
  await fs.ensureDir(tempDir);
  const filePath = path.join(tempDir, filename);
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
  let oldPdfPath = null;
  let newPdfPath = null;
  
  try {
    oldPdfPath = await downloadPDF(oldPdfUrl, 'old.pdf');
    newPdfPath = await downloadPDF(newPdfUrl, 'new.pdf');

    const oldContent = await extractPDFContent(oldPdfPath);
    const newContent = await extractPDFContent(newPdfPath);

    const comparison = compareFields(oldContent, newContent);
    const executionTime = Date.now() - startTime;

    return {
      ...comparison,
      executionTime,
      oldFileName: path.basename(oldPdfUrl),
      newFileName: path.basename(newPdfUrl)
    };
  } catch (error) {
    throw new Error(`PDF comparison failed: ${error.message}`);
  } finally {
    // Clean up temp files
    if (oldPdfPath && fs.existsSync(oldPdfPath)) {
      await fs.remove(oldPdfPath);
    }
    if (newPdfPath && fs.existsSync(newPdfPath)) {
      await fs.remove(newPdfPath);
    }
  }
};

module.exports = { comparePDFs }; 