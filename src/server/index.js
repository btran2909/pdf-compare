const express = require('express');
const cors = require('cors');
const path = require('path');
const { processExcelFile } = require('./services/excelService');
const { comparePDFs } = require('./services/pdfService');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/process', async (req, res) => {
  try {
    const { filePath } = req.body;
    const results = await processExcelFile(filePath);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/compare', async (req, res) => {
  try {
    const { oldPdfUrl, newPdfUrl } = req.body;
    const result = await comparePDFs(oldPdfUrl, newPdfUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 