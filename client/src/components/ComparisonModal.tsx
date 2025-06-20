import React from 'react';
import { ComparisonResult, ResultDetail } from '../types';

interface ComparisonModalProps {
  result: ComparisonResult | null;
  onClose: () => void;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  // Group results by their 'group' property
  const groupedResults = result.results?.reduce((acc: Record<string, ResultDetail[]>, item: ResultDetail) => {
    const group = item.group || 'General Comparison';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {});

  const renderStatus = (status: string) => (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 500,
      background: status === 'Pass' ? '#dcfce7' : '#fee2e2',
      color: status === 'Pass' ? '#166534' : '#991b1b'
    }}>
      {status}
    </span>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Comparison Details</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280'
          }}>×</button>
        </div>
        
        <div style={{ overflowY: 'auto', padding: '16px 24px' }}>
          {groupedResults && Object.entries(groupedResults).map(([groupName, items]) => (
            <div key={groupName} style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '16px',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '8px'
              }}>{groupName}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Field</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Old Value</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>New Value</th>
                    <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #e5e7eb', width: '100px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.key} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
                        {item.key}
                      </td>
                      <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                        {item.old}
                      </td>
                      <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                        {item.new}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        {renderStatus(item.result)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal; 