import React, { useState } from 'react';
import axios from 'axios';
import ComparisonTable from './components/ComparisonTable';
import { ComparisonResult } from './types';

const App: React.FC = () => {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
    <div>
      <h1>PDF Comparison Tool</h1>
      <div>
        <label>Upload Excel File</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
        />
      </div>
      {loading && (
        <div>
          <span>Processing...</span>
        </div>
      )}
      {error && (
        <div style={{ color: 'red' }}>{error}</div>
      )}
      {results.length > 0 && (
        <ComparisonTable results={results} />
      )}
    </div>
  );
};

export default App;
