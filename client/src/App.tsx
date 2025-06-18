import React, { useState } from 'react';
import axios from 'axios';
import ComparisonTable from './components/ComparisonTable';
import { ComparisonResult } from './types';
import './App.css';

const App: React.FC = () => {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5050/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(response.data as ComparisonResult[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
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
          padding: '12px 16px',
          background: '#f3f4f6',
          borderRadius: '6px',
          color: '#374151',
          fontSize: '0.875rem',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
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
          <span>Processing...</span>
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
