const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { processExcelFile } = require('./services/excelService');
const { comparePDFs } = require('./services/pdfService');

const app = express();
const PORT = process.env.PORT || 5050;

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../temp'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// Ensure temp directory exists
const fs = require('fs');
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// API Routes
app.post('/api/process', upload.single('file'), async (req, res) => {
  console.log(JSON.stringify(req.body));
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = await processExcelFile(req.file.path);
    
    // Clean up temp file
    fs.unlinkSync(req.file.path);
    
    res.json(results);
  } catch (error) {
    console.error('Error processing file:', error);
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