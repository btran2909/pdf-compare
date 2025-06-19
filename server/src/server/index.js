const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { processExcelFile } = require('./services/excelService');
const { comparePDFs, getComparisonResult } = require('./services/pdfService');

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

// Store processing status with persistence
const processingStatus = new Map();

// Load existing processes from file (if any)
const loadProcessingStatus = () => {
  try {
    const statusFile = path.join(__dirname, '../temp/processing-status.json');
    if (fs.existsSync(statusFile)) {
      const data = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      data.forEach(([id, status]) => {
        processingStatus.set(id, status);
      });
      console.log('Loaded', processingStatus.size, 'existing processes');
    }
  } catch (error) {
    console.warn('Failed to load processing status:', error.message);
  }
};

// Save processing status to file (debounced)
let saveTimeout = null;
const saveProcessingStatus = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    try {
      const statusFile = path.join(__dirname, '../temp/processing-status.json');
      const data = Array.from(processingStatus.entries());
      fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save processing status:', error.message);
    }
  }, 5000); // Save every 5 seconds instead of immediately
};

// Load existing status on startup
loadProcessingStatus();

// Cleanup old processes on startup
const cleanupOldProcesses = () => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago
  
  for (const [processId, status] of processingStatus.entries()) {
    const processTime = parseInt(processId);
    if (processTime < oneHourAgo) {
      console.log(`Cleaning up old process: ${processId}`);
      processingStatus.delete(processId);
      
      // Clean up temp file if exists
      if (status.filePath && fs.existsSync(status.filePath)) {
        try {
          fs.unlinkSync(status.filePath);
        } catch (error) {
          console.warn('Failed to cleanup old temp file:', error.message);
        }
      }
    }
  }
  
  saveProcessingStatus();
};

cleanupOldProcesses();

// API Routes
app.post('/api/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const processId = Date.now().toString();
    console.log('Creating process with ID:', processId);
    
    processingStatus.set(processId, {
      status: 'processing',
      progress: 0,
      total: 0,
      processed: 0,
      results: [],
      filePath: req.file.path
    });

    console.log('Current processes:', Array.from(processingStatus.keys()));
    saveProcessingStatus(); // Save after creating process

    // Start processing in background
    console.log('Starting Excel processing for file:', req.file.path);
    
    processExcelFile(req.file.path, (progress) => {
      console.log('Progress update for process', processId, ':', progress);
      const status = processingStatus.get(processId);
      if (status) {
        status.progress = progress.percentage;
        status.processed = progress.processed;
        status.total = progress.total;
        saveProcessingStatus(); // Save after progress update
      } else {
        console.warn('Process', processId, 'not found during progress update');
      }
    }).then(results => {
      console.log('Processing completed for process', processId, 'with', results.length, 'results');
      const status = processingStatus.get(processId);
      if (status) {
        status.status = 'completed';
        status.results = results;
        saveProcessingStatus(); // Save after completion
        
        // Clean up temp file after processing is complete
        try {
          if (fs.existsSync(status.filePath)) {
            fs.unlinkSync(status.filePath);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError.message);
        }
      } else {
        console.warn('Process', processId, 'not found when completing');
      }
    }).catch(error => {
      console.error('Processing failed for process', processId, ':', error);
      console.error('Error stack:', error.stack);
      const status = processingStatus.get(processId);
      if (status) {
        status.status = 'error';
        status.error = error.message;
        saveProcessingStatus(); // Save after error
        
        // Clean up temp file even if processing failed
        try {
          if (fs.existsSync(status.filePath)) {
            fs.unlinkSync(status.filePath);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError.message);
        }
      } else {
        console.warn('Process', processId, 'not found when handling error');
      }
    });
    
    res.json({ processId, message: 'Processing started' });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get processing status
app.get('/api/process/:processId', (req, res) => {
  const processId = req.params.processId;
  console.log('Checking status for process:', processId);
  console.log('Available processes:', Array.from(processingStatus.keys()));
  
  const status = processingStatus.get(processId);
  if (!status) {
    console.warn('Process not found:', processId);
    return res.status(404).json({ 
      error: 'Process not found',
      processId: processId,
      availableProcesses: Array.from(processingStatus.keys())
    });
  }
  console.log('Process status:', status);
  res.json(status);
});

// Check if process exists (for debugging)
app.get('/api/process/:processId/exists', (req, res) => {
  const processId = req.params.processId;
  const exists = processingStatus.has(processId);
  res.json({ 
    exists, 
    processId,
    availableProcesses: Array.from(processingStatus.keys())
  });
});

// Force restart a process (for debugging)
app.post('/api/process/:processId/restart', async (req, res) => {
  const processId = req.params.processId;
  const status = processingStatus.get(processId);
  
  if (!status) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  if (status.status === 'processing') {
    // Mark as error and cleanup
    status.status = 'error';
    status.error = 'Process restarted manually';
    saveProcessingStatus();
    
    // Clean up temp file
    if (status.filePath && fs.existsSync(status.filePath)) {
      try {
        fs.unlinkSync(status.filePath);
      } catch (error) {
        console.warn('Failed to cleanup temp file:', error.message);
      }
    }
  }
  
  res.json({ message: 'Process restarted', processId });
});

// Get results when processing is complete
app.get('/api/results/:processId', (req, res) => {
  const status = processingStatus.get(req.params.processId);
  if (!status) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  if (status.status === 'processing') {
    return res.status(202).json({ message: 'Processing in progress', progress: status.progress });
  }
  
  if (status.status === 'error') {
    return res.status(500).json({ error: status.error });
  }
  
  res.json(status.results);
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

app.get('/api/comparison/:id', async (req, res) => {
  try {
    const result = await getComparisonResult(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
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