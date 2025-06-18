# PDF Comparison Tool

A Node.js application that compares PDF files and generates detailed reports.

## Features

- Upload Excel file with UUID pairs
- Download and compare PDF files
- Generate detailed comparison reports
- Modern React UI with real-time status updates

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
npm install
```

3. Install frontend dependencies:
```bash
cd client
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

## API Endpoints

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
  - Tailwind CSS
  - Axios 