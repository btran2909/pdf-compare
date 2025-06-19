const PDFExtract = require('pdf.js-extract').PDFExtract;
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const pdfExtract = new PDFExtract();
const fieldsThatShouldDiffers = [
  {
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
  }
];

const downloadPDF = async (url, filename) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const tempDir = path.join(__dirname, '../../temp');
  await fs.ensureDir(tempDir);
  const filePath = path.join(tempDir, filename);
  await fs.writeFile(filePath, response.data);
  return filePath;
};

function findAndSortByX(content, inputStr) {
  // Tìm object có str = inputStr
  const targetObj = content.find(obj => obj.str.includes(inputStr));
  if (!targetObj) return [];

  // Lấy tất cả object có cùng y
  let sameYList = content.filter(obj => obj.y === targetObj.y);

  // Loại bỏ object có str là '' hoặc ' '
  sameYList = sameYList.filter(obj => obj.str.trim() !== '' && obj.str.trim() !== '-' && obj.str);

  // Sort theo x tăng dần
  sameYList.sort((a, b) => a.x - b.x);

  return sameYList;
}

const extractPDFContent = async (filePath) => {
  const data = await pdfExtract.extract(filePath);
  const dataResult = [];
  
  for (const page of data.pages) {
    const pageData = {
      specialFields: [],
      content: page.content.filter(item => item.str.trim() !== '')
    };

    // Extract special fields
    for (const item of fieldsThatShouldDiffers) {
      const sortedList = findAndSortByX(page.content, item.key);
      if (sortedList.length) {
        pageData.specialFields.push({
          key: item.key,
          selectedIndex: item.selectedIndex,
          content: sortedList
        });
      }
    }
    dataResult.push(pageData);
  }
  return dataResult;
};

const groupContentByLines = (content) => {
  // Group items by Y coordinate (same line)
  const lineGroups = {};
  content.forEach(item => {
    if (item.str.trim()) {  // Skip empty strings
      const y = Math.round(item.y * 10) / 10; // Round to 1 decimal to handle minor differences
      if (!lineGroups[y]) {
        lineGroups[y] = [];
      }
      lineGroups[y].push(item);
    }
  });

  // Sort items in each line by X coordinate
  Object.values(lineGroups).forEach(line => {
    line.sort((a, b) => a.x - b.x);
  });

  // Convert to array of lines
  return Object.values(lineGroups).map(line => ({
    y: line[0].y,
    text: line.map(item => item.str).join(' ').trim()
  }));
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

    // Compare specific fields first
    for (const oldField of oldPage.specialFields) {
      const newField = newPage.specialFields.find(f => f.key === oldField.key);
      
      if (newField) {
        const oldValue = oldField.content[oldField.selectedIndex]?.str;
        const newValue = newField.content[newField.selectedIndex]?.str;
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

    // Compare all lines
    const oldLines = groupContentByLines(oldPage.content);
    const newLines = groupContentByLines(newPage.content);

    // Sort lines by Y coordinate for natural reading order
    oldLines.sort((a, b) => a.y - b.y);
    newLines.sort((a, b) => a.y - b.y);

    // Create a map of processed lines to avoid duplicates
    const processedLines = new Set();

    // Process all old lines
    oldLines.forEach((oldLine, lineIndex) => {
      // Find closest matching line in new content
      const newLine = newLines.find(nl => 
        Math.abs(nl.y - oldLine.y) < 1 // Allow small difference in Y coordinate
      );

      const cleanOldText = oldLine.text.replace(/[€\s]+/g, ' ').trim();
      const cleanNewText = newLine ? newLine.text.replace(/[€\s]+/g, ' ').trim() : '';

      results[`Line ${lineIndex + 1} (Page ${pageIndex + 1})`] = {
        old: oldLine.text,
        new: newLine ? newLine.text : 'N/A',
        result: cleanOldText === cleanNewText ? 'Pass' : 'Fail',
        y: oldLine.y
      };

      if (cleanOldText !== cleanNewText) {
        overallResult = 'Fail';
      }

      processedLines.add(newLine ? newLine.y : null);
    });

    // Process remaining new lines that weren't matched
    const remainingNewLines = newLines.filter(nl => !processedLines.has(nl.y));
    remainingNewLines.sort((a, b) => a.y - b.y);

    remainingNewLines.forEach((newLine, idx) => {
      results[`Line ${oldLines.length + idx + 1} (Page ${pageIndex + 1})`] = {
        old: 'N/A',
        new: newLine.text,
        result: 'Fail',
        y: newLine.y
      };
      overallResult = 'Fail';
    });
  }

  return { results, overallResult };
};

const saveComparisonResult = async (result) => {
  const resultId = crypto.randomUUID();
  const tempDir = path.join(__dirname, '../../temp/results');
  await fs.ensureDir(tempDir);
  
  const resultPath = path.join(tempDir, `${resultId}.json`);
  await fs.writeJson(resultPath, {
    id: resultId,
    ...result
  });
  
  return resultId;
};

const getComparisonResult = async (resultId) => {
  const resultPath = path.join(__dirname, '../../temp/results', `${resultId}.json`);
  if (await fs.pathExists(resultPath)) {
    return await fs.readJson(resultPath);
  }
  throw new Error('Comparison result not found');
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

    const result = {
      ...comparison,
      executionTime,
      oldFileName: path.basename(oldPdfUrl),
      newFileName: path.basename(newPdfUrl)
    };

    // Save full result and get ID
    const resultId = await saveComparisonResult(result);

    // Return minimal info for table
    return {
      id: resultId,
      oldFileName: result.oldFileName,
      newFileName: result.newFileName,
      overallResult: result.overallResult,
      executionTime: result.executionTime
    };

  } catch (error) {
    throw new Error(`PDF comparison failed: ${error.message}`);
  } finally {
    // Clean up temp files
    // if (oldPdfPath && fs.existsSync(oldPdfPath)) {
    //   await fs.remove(oldPdfPath);
    // }
    // if (newPdfPath && fs.existsSync(newPdfPath)) {
    //   await fs.remove(newPdfPath);
    // }
  }
};

module.exports = { comparePDFs, getComparisonResult }; 