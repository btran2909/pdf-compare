import React, { useState } from 'react';
import { ComparisonResult } from '../types';
import ComparisonModal from './ComparisonModal';

interface ComparisonTableProps {
  results: ComparisonResult[];
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ results }) => {
  const [selectedResult, setSelectedResult] = useState<ComparisonResult | null>(null);

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
          {results.map((result, index) => (
            <tr key={index}>
              <td>{result.oldFileName}</td>
              <td>{result.newFileName}</td>
              <td>
                <span style={{ color: result.overallResult === 'Pass' ? 'green' : 'red', fontWeight: 600 }}>
                  {result.overallResult}
                </span>
              </td>
              <td>{result.executionTime}</td>
              <td>
                <button onClick={() => setSelectedResult(result)}>
                  🔍 View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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