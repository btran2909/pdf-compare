import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ComparisonTable from './components/ComparisonTable';
import { ComparisonResult } from './types';
import './App.css';

interface ProcessStatus {
  status: 'processing' | 'completed' | 'error';
  progress: number;
  total: number;
  processed: number;
  results?: ComparisonResult[];
  error?: string;
}

interface ProcessResponse {
  processId: string;
  message: string;
}

const App: React.FC = () => {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processId, setProcessId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
    percentage: number;
  } | null>(null);

  // Poll for progress updates
  useEffect(() => {
    if (!processId) return;

    let retryCount = 0;
    const maxRetries = 5;

    const pollProgress = async () => {
      try {
        const response = await axios.get<ProcessStatus>(`http://localhost:5050/api/process/${processId}`);
        const status = response.data;
        
        if (status.status === 'processing') {
          setProgress({
            processed: status.processed,
            total: status.total,
            percentage: status.progress
          });
        } else if (status.status === 'completed') {
          setResults(status.results || []);
          setLoading(false);
          setProcessId(null);
          setProgress(null);
        } else if (status.status === 'error') {
          setError(status.error || 'Unknown error occurred');
          setLoading(false);
          setProcessId(null);
          setProgress(null);
        }
        retryCount = 0; // Reset retry count on success
      } catch (err) {
        console.error('Error polling progress:', err);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          setError('Failed to check processing status. Please refresh the page.');
          setLoading(false);
          setProcessId(null);
          setProgress(null);
        }
      }
    };

    // Initial delay to avoid race condition
    const initialDelay = setTimeout(() => {
      pollProgress();
    }, 1000);

    const interval = setInterval(pollProgress, 2000);
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [processId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setLoading(true);
    setError(null);
    setProgress(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<ProcessResponse | ComparisonResult[]>('http://localhost:5050/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if ('processId' in response.data) {
        setProcessId(response.data.processId);
      } else {
        // Fallback for small files that complete immediately
        setResults(response.data as ComparisonResult[]);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '24px',
      maxWidth: '100%',
      boxSizing: 'border-box',
      margin: '0 auto'
    }}>
      {/* <h1 style={{ 
        fontSize: '1.875rem',
        fontWeight: 600,
        color: '#111827',
        marginBottom: '24px'
      }}>
        PDF Comparison Tool
      </h1> */}

      <div style={{ 
        marginBottom: '24px',
        background: '#fff',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        <label 
          htmlFor="excelFile" 
          style={{ 
            display: 'block',
            marginBottom: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151'
          }}
        >
          Upload Excel File
        </label>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            position: 'relative',
            flex: '1 1 auto',
            minWidth: 0, // Để input có thể co lại khi cần
            maxWidth: '100%'
          }}>
            <input
              type="file"
              id="excelFile"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#374151',
                backgroundColor: '#f9fafb',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {selectedFile && (
            <div style={{ 
              color: '#6b7280',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 0'
            }}>
              <span>📄</span>
              <span style={{
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {selectedFile.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{
          padding: '16px',
          background: '#f3f4f6',
          borderRadius: '8px',
          color: '#374151',
          fontSize: '0.875rem',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <svg 
              className="animate-spin" 
              style={{
                width: '1rem',
                height: '1rem'
              }}
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Processing Excel file...</span>
          </div>
          
          {progress && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '0.75rem'
              }}>
                <span>Progress: {progress.processed} / {progress.total} records</span>
                <span>{progress.percentage}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress.percentage}%`,
                  height: '100%',
                  background: '#3b82f6',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ 
          color: '#991b1b',
          background: '#fee2e2',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <ComparisonTable results={results} />
      )}
    </div>
  );
};

export default App;
