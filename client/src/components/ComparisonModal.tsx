import React from 'react';
import { ComparisonResult } from '../types';

interface ComparisonModalProps {
  result: ComparisonResult;
  onClose: () => void;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ result, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(100,100,100,0.5)', zIndex: 1000 }}>
      <div style={{ position: 'relative', top: 60, margin: '0 auto', padding: 20, border: '1px solid #ccc', width: '80%', background: '#fff', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Comparison Details</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table border={1} cellPadding={8} cellSpacing={0} style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.results).map(([field, data]) => (
                <tr key={field}>
                  <td>{field}</td>
                  <td>{data.old || 'N/A'}</td>
                  <td>{data.new || 'N/A'}</td>
                  <td style={{ color: data.result === 'Pass' ? 'green' : 'red', fontWeight: 600 }}>{data.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.error && (
          <div style={{ marginTop: 16, color: 'red' }}>
            Error: {result.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonModal; 