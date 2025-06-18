import React, { useState } from 'react';
import axios from 'axios';
import { ComparisonResult } from '../types';
import ComparisonModal from './ComparisonModal';

interface ComparisonTableProps {
  results: ComparisonResult[];
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ results }) => {
  const [selectedResult, setSelectedResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleViewClick = async (resultId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5050/api/comparison/${resultId}`);
      setSelectedResult(response.data as ComparisonResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <table border={1} cellPadding={8} cellSpacing={0} style={{ width: '100%', background: '#fff' }}>
        <thead>
          <tr>
            <th>Old PDF</th>
            <th>New PDF</th>
            <th>Status</th>
            <th>Time (ms)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id}>
              <td>{result.oldFileName}</td>
              <td>{result.newFileName}</td>
              <td>
                <span style={{ color: result.overallResult === 'Pass' ? 'green' : 'red', fontWeight: 600 }}>
                  {result.overallResult}
                </span>
              </td>
              <td>{result.executionTime}</td>
              <td>
                <button 
                  onClick={() => handleViewClick(result.id)}
                  disabled={loading}
                >
                  🔍 View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
      {selectedResult && (
        <ComparisonModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
};

export default ComparisonTable; 