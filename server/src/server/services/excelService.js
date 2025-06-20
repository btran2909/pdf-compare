const path = require('path');
const fs = require('fs-extra');
const ExcelJS = require('exceljs');
const { comparePDFs } = require('./pdfService');

const getCellValueAsString = (cell) => {
  if (!cell || !cell.value) {
    return null;
  }
  if (typeof cell.value === 'object' && cell.value.hyperlink) {
    // Handle hyperlink objects by taking the text
    return cell.value.text;
  }
  if (typeof cell.value === 'object' && cell.value.richText) {
    // Handle rich text objects by concatenating text parts
    return cell.value.richText.map(rt => rt.text).join('');
  }
  return cell.value.toString().trim();
};

// Configuration for concurrency control
const CONCURRENT_LIMIT = 5; // Process 5 PDFs simultaneously
const BATCH_SIZE = 10; // Process in batches of 10

const processExcelFile = async (filePath, onProgress) => {
  try {
    console.log('Starting to process Excel file:', filePath);
    
    // Initial progress - starting to read Excel file
    if (onProgress) {
      onProgress({
        processed: 0,
        total: 0,
        percentage: 0
      });
    }

    const API_BASE_URL = process.env.API_BASE_URL || 'https://api.kikker.nl/core/api/Invoice/get-pdf-file';
    const workbook = new ExcelJS.Workbook();
    
    console.log('Reading Excel file...');
    await workbook.xlsx.readFile(filePath);
    console.log('Excel file read successfully');
    
    const worksheet = workbook.getWorksheet(1);
    const results = [];
    const records = [];
    let rowNumber = 2; // Skip header row

    console.log('Starting to collect records from Excel...');
    
    // First, collect all valid records
    while (worksheet.getRow(rowNumber).getCell(1).value || worksheet.getRow(rowNumber).getCell(2).value) {
      const row = worksheet.getRow(rowNumber);
      const oldPdfUrlExcel = getCellValueAsString(row.getCell(1));
      const newPdfUrlExcel = getCellValueAsString(row.getCell(2));
      
      if (oldPdfUrlExcel && newPdfUrlExcel) {
        records.push({
          rowNumber,
          oldPdfUrlExcel,
          newPdfUrlExcel,
          oldPdfUrl: `${API_BASE_URL}/${oldPdfUrlExcel}`,
          newPdfUrl: `${API_BASE_URL}/${newPdfUrlExcel}`
        });
      }
      rowNumber++;
    }

    console.log('Found', records.length, 'valid records in Excel file');

    // Update progress with total records found
    if (onProgress) {
      onProgress({
        processed: 0,
        total: records.length,
        percentage: 0
      });
    }

    // If no records found, return empty results
    if (records.length === 0) {
      console.log('No records found, returning empty results');
      if (onProgress) {
        onProgress({
          processed: 0,
          total: 0,
          percentage: 100
        });
      }
      return [];
    }

    console.log('Starting batch processing...');
    
    // Process records in batches with concurrency control
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(records.length/BATCH_SIZE)}`);
      const batchResults = await processBatch(batch, onProgress, i, records.length);
      results.push(...batchResults);
    }

    console.log('All batches processed, returning', results.length, 'results');
    return results;
  } catch (error) {
    console.error('Error processing Excel file:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
};

const processBatch = async (batch, onProgress, batchIndex, totalRecords) => {
  console.log(`Starting batch processing: ${batch.length} records, batch ${Math.floor(batchIndex/BATCH_SIZE) + 1}`);
  const results = [];
  const promises = [];
  
  // Create semaphore for concurrency control
  const semaphore = new Semaphore(CONCURRENT_LIMIT);
  
  for (const record of batch) {
    console.log(`Adding record ${record.rowNumber} to batch processing`);
    const promise = processRecordWithSemaphore(record, semaphore);
    promises.push(promise);
  }
  
  console.log(`Waiting for ${promises.length} promises to complete...`);
  
  // Wait for all promises in this batch to complete
  const batchResults = await Promise.allSettled(promises);
  
  console.log(`Batch completed. Results: ${batchResults.length}`);
  
  // Process results
  batchResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`Record ${batch[index].rowNumber} processed successfully`);
      results.push(result.value);
    } else {
      console.error(`Record ${batch[index].rowNumber} failed:`, result.reason);
      const record = batch[index];
      results.push({
        id: `error-${record.rowNumber}-${Date.now()}`, // Generate a unique ID for error rows
        rowNumber: record.rowNumber,
        oldFileName: record.oldPdfUrlExcel, // Use the name from Excel
        newFileName: record.newPdfUrlExcel, // Use the name from Excel
        error: result.reason.message,
        overallResult: 'Error',
        executionTime: 0,
        results: [] // Ensure results array exists
      });
    }
  });
  
  // Report progress
  if (onProgress) {
    const processedCount = (batchIndex + batch.length);
    console.log(`Updating progress: ${processedCount}/${totalRecords} (${Math.round((processedCount / totalRecords) * 100)}%)`);
    onProgress({
      processed: processedCount,
      total: totalRecords,
      percentage: Math.round((processedCount / totalRecords) * 100)
    });
  }
  
  return results;
};

const processRecordWithSemaphore = async (record, semaphore) => {
  console.log(`Starting to process record ${record.rowNumber} with semaphore`);
  return semaphore.acquire().then(async (release) => {
    try {
      console.log(`Processing record ${record.rowNumber}: ${record.oldPdfUrl} vs ${record.newPdfUrl}`);
      const comparisonResult = await comparePDFs(record.oldPdfUrl, record.newPdfUrl);
      console.log(`Record ${record.rowNumber} completed successfully`);
      return {
        rowNumber: record.rowNumber,
        oldPdfUrl: record.oldPdfUrl,
        newPdfUrl: record.newPdfUrl,
        ...comparisonResult
      };
    } catch (error) {
      console.error(`Record ${record.rowNumber} failed:`, error.message);
      // Re-throw the error with additional context
      throw new Error(`Row ${record.rowNumber} (${record.oldPdfUrlExcel} vs ${record.newPdfUrlExcel}): ${error.message}`);
    } finally {
      console.log(`Releasing semaphore for record ${record.rowNumber}`);
      release();
    }
  });
};

// Semaphore implementation for concurrency control
class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.count < this.max) {
        this.count++;
        resolve(() => this.release());
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    this.count--;
    if (this.queue.length > 0) {
      this.count++;
      const next = this.queue.shift();
      next(() => this.release());
    }
  }
}

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