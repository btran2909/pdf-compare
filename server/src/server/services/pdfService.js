const PDFExtract = require('pdf.js-extract').PDFExtract;
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { diffChars } = require('diff');

const pdfExtract = new PDFExtract();
const fieldsThatShouldDiffers = [{
  key: 'Totale kosten in de verbruiksperiode',
  selectedIndex: 2
},
{
  key: 'Door jou te betalen',
  selectedIndex: 2
},
{
  key: 'Leveringskosten van stroom en gas',
  selectedIndex: 2
}];

function findAndSortByX(content, inputStr) {
  // Tìm object có str = inputStr
  const targetObj = content.find(obj => obj.str === inputStr);
  if (!targetObj) return [];

  // Lấy tất cả object có cùng y
  let sameYList = content.filter(obj => obj.y === targetObj.y);

  // Loại bỏ object có str là '' hoặc ' '
  sameYList = sameYList.filter(obj => obj.str.trim() !== '' && obj.str);

  // Sort theo x tăng dần
  sameYList.sort((a, b) => a.x - b.x);

  return sameYList;
}

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
  const dataResult = [];
  for (const page of data.pages) {
    const pageFields = [];
    for (const item of fieldsThatShouldDiffers) {
      const sortedList = findAndSortByX(page.content, item.key);
      if (sortedList.length) {
        pageFields.push({
          key: item.key,
          selectedIndex: item.selectedIndex,
          content: sortedList
        });
      }
    }
    if (pageFields.length) {
      dataResult.push(pageFields);
    }
  }
  return dataResult;
};

const compareFields = (oldContent, newContent) => {
  if (oldContent.length !== newContent.length) {
    throw new Error('Old and new content have different number of pages');
  }

  const results = {};
  let overallResult = 'Pass';

  // Loop through each page
  for (let pageIndex = 0; pageIndex < oldContent.length; pageIndex++) {
    const oldPage = oldContent[pageIndex];
    const newPage = newContent[pageIndex];

    // Compare fields in current page
    for (const oldField of oldPage) {
      const newField = newPage.find(f => f.key === oldField.key);
      
      if (newField) {
        console.log('Comparing field:', oldField.key);
        console.log('Old field content:', oldField.content);
        console.log('New field content:', newField.content);
        
        // Get values at selectedIndex
        const oldValue = oldField.content[oldField.selectedIndex]?.str;
        const newValue = newField.content[newField.selectedIndex]?.str;
        
        console.log('Selected values:', { oldValue, newValue });
        console.log('Selected index:', oldField.selectedIndex);

        // Clean up values (remove currency symbols, spaces, etc)
        const cleanOldValue = oldValue?.replace(/[€\s]/g, '') || '';
        const cleanNewValue = newValue?.replace(/[€\s]/g, '') || '';

        results[`${oldField.key} (Page ${pageIndex + 1})`] = {
          old: oldValue || 'N/A',
          new: newValue || 'N/A',
          result: cleanOldValue !== cleanNewValue ? 'Pass' : 'Fail'
        };

        if (results[`${oldField.key} (Page ${pageIndex + 1})`].result === 'Fail') {
          overallResult = 'Fail';
        }
      }
    }
  }

  console.log('Final results:', results);
  return { results, overallResult };
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
    console.log('oldContent:', oldContent);
    console.log('newContent:', newContent);
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