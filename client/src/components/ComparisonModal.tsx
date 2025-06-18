import React from 'react';
import { ComparisonResult } from '../types';

interface ComparisonModalProps {
  result: ComparisonResult;
  onClose: () => void;
}

interface ParsedLineReference {
  page: number;
  line: number;
  fullKey: string;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ result, onClose }) => {
  // Separate special fields and line comparisons
  const specialFields = Object.entries(result.results).filter(([key]) => 
    key.includes('Totale kosten') || key.includes('Door jou te betalen') || key.includes('Leveringskosten')
  );
  
  // Get all line comparisons and parse page/line numbers
  const lineComparisons = Object.entries(result.results)
    .filter(([key]) => key.includes('Line'))
    .map(([key, value]) => {
      const pageMatch = key.match(/Page (\d+)/);
      const lineMatch = key.match(/Line (\d+)/);
      return {
        page: parseInt(pageMatch?.[1] || '0'),
        line: parseInt(lineMatch?.[1] || '0'),
        fullKey: key,
        value
      };
    })
    .sort((a, b) => {
      // Sort by page first
      if (a.page !== b.page) return a.page - b.page;
      // Then by line number
      return a.line - b.line;
    });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(100,100,100,0.5)', zIndex: 1000 }}>
      <div style={{ 
        position: 'relative', 
        top: 60, 
        margin: '0 auto', 
        padding: 20, 
        border: '1px solid #ccc', 
        width: '90%', 
        maxWidth: '1200px',
        background: '#fff', 
        borderRadius: 8,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Comparison Details</h3>
          <button onClick={onClose} style={{ padding: '4px 8px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Special Fields Section */}
        {specialFields.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Special Fields Comparison</h4>
            <div style={{ overflowX: 'auto' }}>
              <table border={1} cellPadding={8} cellSpacing={0} style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th>Field</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {specialFields.map(([field, data]) => (
                    <tr key={field}>
                      <td>{field}</td>
                      <td>{data.old || 'N/A'}</td>
                      <td>{data.new || 'N/A'}</td>
                      <td style={{ 
                        color: data.result === 'Pass' ? 'green' : 'red', 
                        fontWeight: 600 
                      }}>
                        {data.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Line by Line Comparison Section */}
        {lineComparisons.length > 0 && (
          <div>
            <h4 style={{ marginBottom: 12 }}>Complete Document Comparison</h4>
            <div style={{ overflowX: 'auto' }}>
              <table border={1} cellPadding={8} cellSpacing={0} style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ width: '8%' }}>Page</th>
                    <th style={{ width: '8%' }}>Line</th>
                    <th style={{ width: '37%' }}>Old Content</th>
                    <th style={{ width: '37%' }}>New Content</th>
                    <th style={{ width: '10%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lineComparisons.map((item) => (
                    <tr key={item.fullKey} style={{ 
                      background: item.value.result === 'Fail' ? '#fff0f0' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}>
                      <td style={{ textAlign: 'center' }}>{item.page}</td>
                      <td style={{ textAlign: 'center' }}>{item.line}</td>
                      <td style={{ 
                        padding: '8px',
                        background: item.value.old === 'N/A' ? '#f5f5f5' : 'transparent',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {item.value.old}
                      </td>
                      <td style={{ 
                        padding: '8px',
                        background: item.value.new === 'N/A' ? '#f5f5f5' : 'transparent',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {item.value.new}
                      </td>
                      <td style={{ 
                        color: item.value.result === 'Pass' ? 'green' : 'red', 
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        {item.value.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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