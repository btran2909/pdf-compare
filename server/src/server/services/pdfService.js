const PDFExtract = require('pdf.js-extract').PDFExtract;
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const pdfExtract = new PDFExtract();

// Custom check for Vaste leveringskosten: "X dagen" part must be the same, but the final cost must be different.
const checkVasteLeveringskosten = (oldContent, newContent) => {
  if (!oldContent || !newContent || oldContent.length < 2 || newContent.length < 2) return false;

  const oldText = oldContent.map(o => o.str).join(' ');
  const newText = newContent.map(o => o.str).join(' ');

  // Extract number of days from "X dagen"
  const oldDaysMatch = oldText.match(/(\d+)\s+dagen/);
  const newDaysMatch = newText.match(/(\d+)\s+dagen/);

  // If "dagen" is present, the number of days must match.
  if (oldDaysMatch && newDaysMatch) {
    if (oldDaysMatch[1] !== newDaysMatch[1]) {
      return false; // Days are present but different, fail.
    }
  } else if (oldDaysMatch || newDaysMatch) {
    return false; // "dagen" present in one but not the other, fail.
  }

  // The final cost value (last element on the line) must be different
  const oldCost = oldContent[oldContent.length - 1].str.replace(/[€\s,.]/g, '');
  const newCost = newContent[newContent.length - 1].str.replace(/[€\s,.]/g, '');
  
  return oldCost !== newCost;
};

const specialFieldDefinitions = [
  // Group 1: Must be DIFFERENT
  { key: 'Totale kosten in de verbruiksperiode', selectedIndex: 2, type: 'different', group: 'Phải khác nhau' },
  { key: 'Door jou te betalen', selectedIndex: 2, type: 'different', group: 'Phải khác nhau' },
  { key: 'Leveringskosten van stroom en gas', selectedIndex: 2, type: 'different', group: 'Phải khác nhau' },
  
  // Group 2: Must be the SAME (whole line)
  { key: 'Overheidsheffingen op stroom en gas, dit dragen we af aan de overheid', type: 'same-line', group: 'Phải giống nhau' },
  { key: 'Netbeheerkosten op stroom en gas, dit dragen we af aan je netbeheerder', type: 'same-line', group: 'Phải giống nhau' },
  { key: 'In rekening gebrachte termijnbedragen', type: 'same-line', group: 'Phải giống nhau' },

  // Group 3: BFDC - Must be DIFFERENT
  { key: 'Totale netto verbruik', selectedIndex: 1, type: 'different', group: 'BFDC buộc phải khác nhau' },
  { key: 'Vaste leveringskosten voor stroom', type: 'custom', customCheck: checkVasteLeveringskosten, group: 'BFDC buộc phải khác nhau' },
  { key: 'Vaste leveringskosten voor gas', type: 'custom', customCheck: checkVasteLeveringskosten, group: 'BFDC buộc phải khác nhau' },
  { key: 'TERZAKE ENERGIE GROENE STROOM TERZAKE ENERGIE DYNAMISCH', selectedIndex: 0, type: 'different', group: 'BFDC buộc phải khác nhau' },
  { key: '(01-09-2024 / 01-10-2024) | 21% BTW', selectedIndex: 0, type: 'different', group: 'BFDC buộc phải khác nhau' },
];

const downloadPDF = async (url, filename) => {
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      maxContentLength: 50 * 1024 * 1024 // 50MB max file size
    });
    const tempDir = path.join(__dirname, '../temp');
    await fs.ensureDir(tempDir);
    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, response.data);
    return filePath;
  } catch (error) {
    throw new Error(`Failed to download PDF from ${url}: ${error.message}`);
  }
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
    for (const item of specialFieldDefinitions) {
      const sortedList = findAndSortByX(page.content, item.key);
      if (sortedList.length) {
        pageData.specialFields.push({ ...item, content: sortedList });
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
  // This filter seems suspicious and might be the source of the page count mismatch.
  // I will comment it out to handle page differences gracefully below.
  // if (newContent.length > oldContent.length) {
  //   newContent = newContent.filter((_, idx) => idx !== 1);
  // }

  const results = {};
  let overallResult = 'Pass';
  const maxPages = Math.max(oldContent.length, newContent.length);

  // If page counts are different, we mark the overall result as 'Fail'
  // but continue processing to find other differences.
  if (oldContent.length !== newContent.length) {
    overallResult = 'Fail';
    results['PageCountMismatch'] = {
      key: 'Page Count',
      old: `${oldContent.length} pages`,
      new: `${newContent.length} pages`,
      result: 'Fail',
      group: 'Page Structure',
    };
  }

  // Loop through each page up to the maximum number of pages
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const oldPage = oldContent[pageIndex];
    const newPage = newContent[pageIndex];

    // Case 1: Page exists in old but not in new (page removed)
    if (oldPage && !newPage) {
      results[`Page ${pageIndex + 1} Content`] = {
        key: `Page ${pageIndex + 1}`,
        old: 'Page exists',
        new: 'Page does not exist (Removed)',
        result: 'Fail',
        group: 'Page Structure',
      };
      continue; // Skip to the next page
    }

    // Case 2: Page exists in new but not in old (page added)
    if (!oldPage && newPage) {
      results[`Page ${pageIndex + 1} Content`] = {
        key: `Page ${pageIndex + 1}`,
        old: 'Page does not exist (Added)',
        new: 'Page exists',
        result: 'Fail',
        group: 'Page Structure',
      };
      continue; // Skip to the next page
    }

    // This should not happen with the current loop structure, but as a safeguard:
    if (!oldPage || !newPage) {
      continue;
    }
    
    // Compare specific fields first
    const processedYCoords = new Set();
    for (const oldField of oldPage.specialFields) {
      const newField = newPage.specialFields.find(f => f.key === oldField.key);
      
      if (newField) {
        // Mark these lines as processed so they don't get compared again
        oldField.content.forEach(item => processedYCoords.add(item.y));
        newField.content.forEach(item => processedYCoords.add(item.y));
        
        let result = 'Fail';
        let oldValue, newValue;
        
        if (oldField.type === 'custom' && oldField.customCheck) {
          result = oldField.customCheck(oldField.content, newField.content) ? 'Pass' : 'Fail';
          oldValue = oldField.content.map(c => c.str).join(' ');
          newValue = newField.content.map(c => c.str).join(' ');
        } else if (oldField.type === 'same-line') {
          oldValue = oldField.content.map(c => c.str).join(' ');
          newValue = newField.content.map(c => c.str).join(' ');
          // Compare entire line, ignoring only slight whitespace differences
          const cleanOldValue = oldValue.replace(/\s+/g, ' ').trim();
          const cleanNewValue = newValue.replace(/\s+/g, ' ').trim();
          if (cleanOldValue === cleanNewValue) result = 'Pass';
        } else {
          oldValue = oldField.content[oldField.selectedIndex]?.str;
          newValue = newField.content[newField.selectedIndex]?.str;
          const cleanOldValue = oldValue?.replace(/[€\s,.]/g, '') || '';
          const cleanNewValue = newValue?.replace(/[€\s,.]/g, '') || '';

          if (oldField.type === 'different') {
            if (cleanOldValue !== cleanNewValue) result = 'Pass';
          } else if (oldField.type === 'same') {
            if (cleanOldValue === cleanNewValue) result = 'Pass';
          }
        }

        results[oldField.key] = {
          key: `${oldField.key} (Page ${pageIndex + 1})`,
          old: oldValue || 'N/A',
          new: newValue || 'N/A',
          result: result,
          group: oldField.group,
        };

        if (result === 'Fail') {
          overallResult = 'Fail';
        }
      }
    }

    // Compare all other lines (default rule: must be the same)
    const oldLines = groupContentByLines(oldPage.content.filter(c => !processedYCoords.has(c.y)));
    const newLines = groupContentByLines(newPage.content.filter(c => !processedYCoords.has(c.y)));

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

      // Only add if it's a fail, as "Pass" is the default for all other lines
      if (cleanOldText !== cleanNewText) {
        results[`Line ${lineIndex + 1} (Page ${pageIndex + 1})`] = {
          key: `Line ${lineIndex + 1} (Page ${pageIndex + 1})`,
          old: oldLine.text,
          new: newLine ? newLine.text : 'N/A',
          result: 'Fail',
          group: 'Các dòng còn lại (phải giống nhau)',
          y: oldLine.y
        };
        overallResult = 'Fail';
      }

      if (newLine) {
        processedLines.add(newLine.y);
      }
    });

    // Process remaining new lines that weren't matched
    const remainingNewLines = newLines.filter(nl => !processedLines.has(nl.y));
    remainingNewLines.sort((a, b) => a.y - b.y);

    remainingNewLines.forEach((newLine, idx) => {
      const lineKey = `New Line ${idx + 1} (Page ${pageIndex + 1}) on Y:${newLine.y.toFixed(2)}`;
      results[lineKey] = {
        key: lineKey,
        old: 'N/A',
        new: newLine.text,
        result: 'Fail',
        group: 'Các dòng còn lại (phải giống nhau)',
        y: newLine.y
      };
      overallResult = 'Fail';
    });
  }

  return { results: Object.values(results), overallResult };
};

const saveComparisonResult = async (result) => {
  const resultId = crypto.randomUUID();
  const tempDir = path.join(__dirname, '../temp/results');
  await fs.ensureDir(tempDir);
  
  const resultPath = path.join(tempDir, `${resultId}.json`);
  await fs.writeJson(resultPath, {
    id: resultId,
    ...result
  });
  
  return resultId;
};

const getComparisonResult = async (resultId) => {
  const resultPath = path.join(__dirname, '../temp/results', `${resultId}.json`);
  if (await fs.pathExists(resultPath)) {
    return await fs.readJson(resultPath);
  }
  throw new Error('Comparison result not found');
};

const comparePDFs = async (oldPdfUrl, newPdfUrl) => {
  const startTime = Date.now();
  let oldPdfPath = null;
  let newPdfPath = null;

  // Generate unique filenames for storing PDFs temporarily
  const oldFileName = `old_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;
  const newFileName = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;

  try {
    oldPdfPath = await downloadPDF(oldPdfUrl, oldFileName);
    newPdfPath = await downloadPDF(newPdfUrl, newFileName);

    const oldContent = await extractPDFContent(oldPdfPath);
    const newContent = await extractPDFContent(newPdfPath);
    const comparison = compareFields(oldContent, newContent);
    const executionTime = Date.now() - startTime;

    // This is the full result object that will be saved to a JSON file
    const result = {
      ...comparison,
      executionTime,
      // Store the generated filenames, not the original ones from the URL
      oldFileName: oldFileName, 
      newFileName: newFileName,
      // Also store original URLs for reference
      oldFileUrl: oldPdfUrl,
      newFileUrl: newPdfUrl
    };

    // Save full result and get ID
    const resultId = await saveComparisonResult(result);

    // Return a smaller object for immediate display in the UI table.
    // Here, we use the original filenames from the URL for better readability.
    return {
      id: resultId,
      oldFileName: path.basename(oldPdfUrl),
      newFileName: path.basename(newPdfUrl),
      overallResult: result.overallResult,
      executionTime: result.executionTime
    };

  } catch (error) {
    throw new Error(`PDF comparison failed: ${error.message}`);
  } finally {
    // Clean up temp files
    // try {
    //   if (oldPdfPath && await fs.pathExists(oldPdfPath)) {
    //     await fs.remove(oldPdfPath);
    //   }
    //   if (newPdfPath && await fs.pathExists(newPdfPath)) {
    //     await fs.remove(newPdfPath);
    //   }
    // } catch (cleanupError) {
    //   console.warn('Failed to cleanup temp files:', cleanupError.message);
    // }
  }
};

const findDifferences = (oldContent, newContent) => {
  const oldPages = [];
  const newPages = [];
  let totalDifferences = 0;
  const pagesWithDifferences = [];

  // Ensure both PDFs have the same number of pages
  const maxPages = Math.max(oldContent.length, newContent.length);
  
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const oldPage = oldContent[pageIndex] || { content: [], specialFields: [] };
    const newPage = newContent[pageIndex] || { content: [], specialFields: [] };
    
    const oldPageDifferences = [];
    const newPageDifferences = [];
    let pageHasDifferences = false;

    // Compare content items
    const oldItems = oldPage.content || [];
    const newItems = newPage.content || [];
    
    // Create maps for quick lookup
    const oldItemMap = new Map();
    const newItemMap = new Map();
    
    oldItems.forEach(item => {
      const key = `${item.x.toFixed(2)}_${item.y.toFixed(2)}_${item.str}`;
      oldItemMap.set(key, item);
    });
    
    newItems.forEach(item => {
      const key = `${item.x.toFixed(2)}_${item.y.toFixed(2)}_${item.str}`;
      newItemMap.set(key, item);
    });

    // Find items that exist in old but not in new (removed)
    oldItems.forEach(oldItem => {
      const key = `${oldItem.x.toFixed(2)}_${oldItem.y.toFixed(2)}_${oldItem.str}`;
      if (!newItemMap.has(key)) {
        oldPageDifferences.push({
          x: oldItem.x,
          y: oldItem.y,
          width: oldItem.width || 50,
          height: oldItem.height || 12,
          type: 'removed'
        });
        pageHasDifferences = true;
        totalDifferences++;
      }
    });

    // Find items that exist in new but not in old (added)
    newItems.forEach(newItem => {
      const key = `${newItem.x.toFixed(2)}_${newItem.y.toFixed(2)}_${newItem.str}`;
      if (!oldItemMap.has(key)) {
        newPageDifferences.push({
          x: newItem.x,
          y: newItem.y,
          width: newItem.width || 50,
          height: newItem.height || 12,
          type: 'added'
        });
        pageHasDifferences = true;
        totalDifferences++;
      }
    });

    // Find modified items (same position but different content)
    oldItems.forEach(oldItem => {
      const newItem = newItems.find(ni => 
        Math.abs(ni.x - oldItem.x) < 5 && Math.abs(ni.y - oldItem.y) < 5
      );
      
      if (newItem && newItem.str !== oldItem.str) {
        oldPageDifferences.push({
          x: oldItem.x,
          y: oldItem.y,
          width: oldItem.width || 50,
          height: oldItem.height || 12,
          type: 'modified'
        });
        
        newPageDifferences.push({
          x: newItem.x,
          y: newItem.y,
          width: newItem.width || 50,
          height: newItem.height || 12,
          type: 'modified'
        });
        
        pageHasDifferences = true;
        totalDifferences++;
      }
    });

    // Compare special fields
    const oldSpecialFields = oldPage.specialFields || [];
    const newSpecialFields = newPage.specialFields || [];
    
    oldSpecialFields.forEach(oldField => {
      const newField = newSpecialFields.find(nf => nf.key === oldField.key);
      
      if (newField) {
        // Compare field content
        const oldFieldStr = oldField.content.map(c => c.str).join(' ');
        const newFieldStr = newField.content.map(c => c.str).join(' ');
        
        if (oldFieldStr !== newFieldStr) {
          // Mark all items in this field as modified
          oldField.content.forEach(item => {
            oldPageDifferences.push({
              x: item.x,
              y: item.y,
              width: item.width || 50,
              height: item.height || 12,
              type: 'modified'
            });
          });
          
          newField.content.forEach(item => {
            newPageDifferences.push({
              x: item.x,
              y: item.y,
              width: item.width || 50,
              height: item.height || 12,
              type: 'modified'
            });
          });
          
          pageHasDifferences = true;
          totalDifferences++;
        }
      } else {
        // Field exists in old but not in new
        oldField.content.forEach(item => {
          oldPageDifferences.push({
            x: item.x,
            y: item.y,
            width: item.width || 50,
            height: item.height || 12,
            type: 'removed'
          });
        });
        pageHasDifferences = true;
        totalDifferences++;
      }
    });

    // Fields that exist in new but not in old
    newSpecialFields.forEach(newField => {
      const oldField = oldSpecialFields.find(of => of.key === newField.key);
      if (!oldField) {
        newField.content.forEach(item => {
          newPageDifferences.push({
            x: item.x,
            y: item.y,
            width: item.width || 50,
            height: item.height || 12,
            type: 'added'
          });
        });
        pageHasDifferences = true;
        totalDifferences++;
      }
    });

    if (pageHasDifferences) {
      pagesWithDifferences.push(pageIndex + 1);
    }

    oldPages.push(oldPageDifferences);
    newPages.push(newPageDifferences);
  }

  return {
    oldPages,
    newPages,
    totalDifferences,
    pagesWithDifferences
  };
};

module.exports = { comparePDFs, getComparisonResult, extractPDFContent, findDifferences }; 