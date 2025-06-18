import React, { useState, useMemo } from 'react';
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

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ result, onClose }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});

  // Separate special fields and line comparisons
  const specialFields = Object.entries(result.results).filter(([key]) => 
    key.includes('Totale kosten') || key.includes('Door jou te betalen') || key.includes('Leveringskosten')
  );
  
  // Get all line comparisons and parse page/line numbers
  const lineComparisons = useMemo(() => {
    let comparisons = Object.entries(result.results)
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
      });

    // Apply filters
    Object.entries(filterConfig).forEach(([key, value]) => {
      if (value && value.trim() !== '') {  // Only apply filter if value exists and is not empty
        const lowerValue = value.toLowerCase().trim();
        comparisons = comparisons.filter(item => {
          switch (key) {
            case 'page':
              return item.page.toString().includes(lowerValue);
            case 'line':
              return item.line.toString().includes(lowerValue);
            case 'old':
              return (item.value.old || '').toLowerCase().includes(lowerValue);
            case 'new':
              return (item.value.new || '').toLowerCase().includes(lowerValue);
            case 'status':
              return (item.value.result || '').toLowerCase().includes(lowerValue);
            default:
              return true;
          }
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      comparisons.sort((a, b) => {
        let aValue: string | number | null = null;
        let bValue: string | number | null = null;

        switch (sortConfig.key) {
          case 'page':
            aValue = a.page;
            bValue = b.page;
            break;
          case 'line':
            aValue = a.line;
            bValue = b.line;
            break;
          case 'old':
            aValue = (a.value.old || '').toLowerCase();
            bValue = (b.value.old || '').toLowerCase();
            break;
          case 'new':
            aValue = (a.value.new || '').toLowerCase();
            bValue = (b.value.new || '').toLowerCase();
            break;
          case 'status':
            aValue = (a.value.result || '').toLowerCase();
            bValue = (b.value.result || '').toLowerCase();
            break;
          default:
            return 0;
        }

        // Handle null/undefined values
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return comparisons;
  }, [result.results, sortConfig, filterConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilter = (key: string, value: string) => {
    const newValue = value.trim();
    setFilterConfig(prev => ({
      ...prev,
      [key]: newValue
    }));
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return (
      <span style={{ 
        marginLeft: '4px',
        color: '#6b7280',
        fontSize: '0.75rem'
      }}>
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.6)', 
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        position: 'relative',
        width: '95%', 
        maxWidth: '1400px',
        maxHeight: '90vh',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>Comparison Details</h3>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1.25rem',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Special Fields Section */}
          {specialFields.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ 
                marginBottom: '16px', 
                fontSize: '1.1rem',
                color: '#111827',
                fontWeight: 600,
                marginTop: 0
              }}>
                Special Fields Comparison
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb'
                      }}>Field</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb'
                      }}>Old Value</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb'
                      }}>New Value</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        borderBottom: '2px solid #e5e7eb'
                      }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialFields.map(([field, data], index) => (
                      <tr key={field} style={{ 
                        background: index % 2 === 0 ? '#fff' : '#f9fafb',
                        transition: 'background-color 0.2s'
                      }}>
                        <td style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb'
                        }}>{field}</td>
                        <td style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb',
                          background: data.result === 'Fail' ? '#fff5f5' : 'transparent'
                        }}>{data.old || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb',
                          background: data.result === 'Fail' ? '#fff5f5' : 'transparent'
                        }}>{data.new || 'N/A'}</td>
                        <td style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            background: data.result === 'Pass' ? '#dcfce7' : '#fee2e2',
                            color: data.result === 'Pass' ? '#166534' : '#991b1b'
                          }}>
                            {data.result}
                          </span>
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
              {/* <h4 style={{ 
                marginBottom: '16px',
                fontSize: '1.1rem',
                color: '#111827',
                fontWeight: 600
              }}>
                Complete Document Comparison
              </h4> */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  tableLayout: 'fixed'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ 
                        width: '8%', 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <button 
                            onClick={() => handleSort('page')}
                            style={{ 
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              transition: 'all 0.2s',
                              color: sortConfig.key === 'page' ? '#2563eb' : '#374151',
                              fontWeight: sortConfig.key === 'page' ? 600 : 'normal'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            Page {renderSortIcon('page')}
                          </button>
                        </div>
                        <div style={{ padding: '0 4px' }}>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={filterConfig.page || ''}
                            onChange={(e) => handleFilter('page', e.target.value)}
                            style={{ 
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </th>
                      <th style={{ 
                        width: '8%', 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <button 
                            onClick={() => handleSort('line')}
                            style={{ 
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              transition: 'all 0.2s',
                              color: sortConfig.key === 'line' ? '#2563eb' : '#374151',
                              fontWeight: sortConfig.key === 'line' ? 600 : 'normal'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            Line {renderSortIcon('line')}
                          </button>
                        </div>
                        <div style={{ padding: '0 4px' }}>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={filterConfig.line || ''}
                            onChange={(e) => handleFilter('line', e.target.value)}
                            style={{ 
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </th>
                      <th style={{ 
                        width: '37%', 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <button 
                            onClick={() => handleSort('old')}
                            style={{ 
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              transition: 'all 0.2s',
                              color: sortConfig.key === 'old' ? '#2563eb' : '#374151',
                              fontWeight: sortConfig.key === 'old' ? 600 : 'normal'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            Old Content {renderSortIcon('old')}
                          </button>
                        </div>
                        <div style={{ padding: '0 4px' }}>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={filterConfig.old || ''}
                            onChange={(e) => handleFilter('old', e.target.value)}
                            style={{ 
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </th>
                      <th style={{ 
                        width: '37%', 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <button 
                            onClick={() => handleSort('new')}
                            style={{ 
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              transition: 'all 0.2s',
                              color: sortConfig.key === 'new' ? '#2563eb' : '#374151',
                              fontWeight: sortConfig.key === 'new' ? 600 : 'normal'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            New Content {renderSortIcon('new')}
                          </button>
                        </div>
                        <div style={{ padding: '0 4px' }}>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={filterConfig.new || ''}
                            onChange={(e) => handleFilter('new', e.target.value)}
                            style={{ 
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </th>
                      <th style={{ 
                        width: '10%', 
                        padding: '12px 8px', 
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <button 
                            onClick={() => handleSort('status')}
                            style={{ 
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              transition: 'all 0.2s',
                              color: sortConfig.key === 'status' ? '#2563eb' : '#374151',
                              fontWeight: sortConfig.key === 'status' ? 600 : 'normal'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            Status {renderSortIcon('status')}
                          </button>
                        </div>
                        <div style={{ padding: '0 4px' }}>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={filterConfig.status || ''}
                            onChange={(e) => handleFilter('status', e.target.value)}
                            style={{ 
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineComparisons.map((item, index) => (
                      <tr key={item.fullKey} style={{ 
                        background: item.value.result === 'Fail' ? '#fef2f2' : index % 2 === 0 ? '#fff' : '#f9fafb',
                        transition: 'background-color 0.2s'
                      }}>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          borderBottom: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb'
                        }}>{item.page}</td>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          borderBottom: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb'
                        }}>{item.line}</td>
                        <td style={{ 
                          padding: '12px',
                          borderBottom: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb',
                          background: item.value.old === 'N/A' ? '#f3f4f6' : item.value.result === 'Fail' ? '#fff5f5' : 'transparent',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem'
                        }}>{item.value.old}</td>
                        <td style={{ 
                          padding: '12px',
                          borderBottom: '1px solid #e5e7eb',
                          borderRight: '1px solid #e5e7eb',
                          background: item.value.new === 'N/A' ? '#f3f4f6' : item.value.result === 'Fail' ? '#fff5f5' : 'transparent',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem'
                        }}>{item.value.new}</td>
                        <td style={{ 
                          padding: '12px',
                          borderBottom: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            background: item.value.result === 'Pass' ? '#dcfce7' : '#fee2e2',
                            color: item.value.result === 'Pass' ? '#166534' : '#991b1b'
                          }}>
                            {item.value.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.error && (
            <div style={{ 
              marginTop: '16px',
              padding: '12px 16px',
              background: '#fee2e2',
              borderRadius: '6px',
              color: '#991b1b'
            }}>
              Error: {result.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal; 