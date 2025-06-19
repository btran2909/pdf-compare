# PDF Comparison Tool

A tool for comparing PDF files based on Excel file input with performance optimizations for large datasets.

## Features

- **Excel File Processing**: Upload Excel files with PDF URLs for batch comparison
- **Concurrent Processing**: Process multiple PDFs simultaneously (configurable concurrency)
- **Progress Tracking**: Real-time progress updates for large file processing
- **Memory Management**: Efficient memory usage with automatic temp file cleanup
- **Error Handling**: Robust error handling with detailed error reporting
- **Batch Processing**: Process records in configurable batches for optimal performance

## Performance Optimizations

### For Large Excel Files

The application has been optimized to handle Excel files with many records efficiently:

1. **Concurrency Control**: 
   - Processes up to 5 PDFs simultaneously (configurable)
   - Uses semaphore pattern to prevent resource exhaustion

2. **Batch Processing**:
   - Processes records in batches of 10 (configurable)
   - Reduces memory pressure and improves stability

3. **Progress Tracking**:
   - Real-time progress updates via polling
   - Shows processed/total records and percentage completion

4. **Memory Management**:
   - Automatic cleanup of temporary PDF files
   - Unique filenames to prevent conflicts
   - Configurable file size limits (50MB max)

5. **Error Resilience**:
   - Individual record failures don't stop the entire process
   - Detailed error reporting per record
   - Graceful handling of network timeouts

## Configuration

### Server-side Configuration

In `server/src/server/services/excelService.js`:

```javascript
const CONCURRENT_LIMIT = 5; // Number of simultaneous PDF comparisons
const BATCH_SIZE = 10;      // Number of records per batch
```

### PDF Service Configuration

In `server/src/server/services/pdfService.js`:

```javascript
// Download timeout and file size limits
timeout: 30000, // 30 seconds
maxContentLength: 50 * 1024 * 1024 // 50MB max file size
```

## API Endpoints

### POST /api/process
Upload Excel file for processing. Returns a process ID for tracking.

**Response:**
```json
{
  "processId": "1234567890",
  "message": "Processing started"
}
```

### GET /api/process/:processId
Get processing status and progress.

**Response:**
```json
{
  "status": "processing|completed|error",
  "progress": 75,
  "processed": 15,
  "total": 20,
  "results": [...], // Only when completed
  "error": "..." // Only when error
}
```

### GET /api/results/:processId
Get final results when processing is complete.

## Usage

1. **Start the server:**
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Start the client:**
   ```bash
   cd client
   npm install
   npm start
   ```

3. **Upload Excel file:**
   - Excel file should have URLs in columns A and B
   - Column A: Old PDF URLs
   - Column B: New PDF URLs
   - First row should be headers

4. **Monitor progress:**
   - Progress bar shows real-time processing status
   - Results appear automatically when complete

## Troubleshooting

### Common Issues

1. **Memory Issues**: Reduce `CONCURRENT_LIMIT` if experiencing memory problems
2. **Network Timeouts**: Increase timeout values in PDF service for slow connections
3. **File Size Limits**: Adjust `maxContentLength` for larger PDF files
4. **Processing Speed**: Increase `CONCURRENT_LIMIT` for faster processing (if resources allow)

### Performance Tuning

- **For high-performance servers**: Increase `CONCURRENT_LIMIT` to 10-15
- **For memory-constrained environments**: Reduce `CONCURRENT_LIMIT` to 2-3
- **For very large files**: Reduce `BATCH_SIZE` to 5 for better memory management

## Technical Details

### Architecture

- **Frontend**: React with TypeScript, real-time progress polling
- **Backend**: Node.js with Express, concurrent processing with semaphores
- **PDF Processing**: pdf.js-extract for content extraction
- **File Handling**: ExcelJS for Excel processing, fs-extra for file operations

### Concurrency Model

Uses a semaphore pattern to control concurrent PDF processing:

```javascript
class Semaphore {
  constructor(max) {
    this.max = max;        // Maximum concurrent operations
    this.count = 0;        // Current active operations
    this.queue = [];       // Waiting operations
  }
}
```

This ensures optimal resource utilization while preventing system overload.

## Project Structure
```
pdf-compare/
  client/   # React frontend
  server/   # Node.js backend
  README.md
```

## Prerequisites

- Node.js 14+ and npm
- Modern web browser

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pdf-compare
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Install frontend dependencies:
```bash
cd ../client
npm install
```

## Configuration

1. Create a `.env` file in the root directory:
```
PORT=5000
API_BASE_URL=https://your-api-endpoint.com
```

## Running the Application

1. Start the backend server:
```bash
cd server
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd client
npm start
```

The application will be available at `http://localhost:3000`

## Usage

1. Prepare an Excel file with two columns:
   - `rsUuid`: UUID for the old PDF
   - `invoiceUuid`: UUID for the new PDF

2. Upload the Excel file through the web interface

3. View the comparison results in the table

4. Click "View" to see detailed comparison for each pair

## API Endpoints (Backend)

- `POST /api/process`: Process Excel file and compare PDFs
- `POST /api/compare`: Compare two PDF files directly

## Technologies Used

- Backend:
  - Node.js
  - Express
  - pdf.js-extract
  - ExcelJS
  - Axios

- Frontend:
  - React
  - TypeScript
  - Axios 