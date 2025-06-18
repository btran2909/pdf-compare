import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { ComparisonResult } from '../types';
import ComparisonModal from './ComparisonModal';

interface ComparisonTableProps {
  results: ComparisonResult[];
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ results }) => {
  const [selectedResult, setSelectedResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});

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

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilter = (key: string, value: string) => {
    setFilterConfig(prev => ({
      ...prev,
      [key]: value
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

  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];

    // Apply filters
    Object.entries(filterConfig).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        const lowerValue = value.toLowerCase().trim();
        filtered = filtered.filter(item => {
          switch (key) {
            case 'oldFile':
              return item.oldFileName.toLowerCase().includes(lowerValue);
            case 'newFile':
              return item.newFileName.toLowerCase().includes(lowerValue);
            case 'status':
              return item.overallResult.toLowerCase().includes(lowerValue);
            case 'time':
              return item.executionTime.toString().includes(lowerValue);
            default:
              return true;
          }
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        switch (sortConfig.key) {
          case 'oldFile':
            aValue = a.oldFileName;
            bValue = b.oldFileName;
            break;
          case 'newFile':
            aValue = a.newFileName;
            bValue = b.newFileName;
            break;
          case 'status':
            aValue = a.overallResult;
            bValue = b.overallResult;
            break;
          case 'time':
            aValue = a.executionTime;
            bValue = b.executionTime;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [results, sortConfig, filterConfig]);

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#fff',
          tableLayout: 'fixed'
        }}>
          <thead>
            <tr>
              <th style={{ 
                width: '25%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <button 
                    onClick={() => handleSort('oldFile')}
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
                      color: sortConfig.key === 'oldFile' ? '#2563eb' : '#374151',
                      fontWeight: sortConfig.key === 'oldFile' ? 600 : 'normal'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Old PDF {renderSortIcon('oldFile')}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filterConfig.oldFile || ''}
                  onChange={(e) => handleFilter('oldFile', e.target.value)}
                  style={{ 
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </th>
              <th style={{ 
                width: '25%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <button 
                    onClick={() => handleSort('newFile')}
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
                      color: sortConfig.key === 'newFile' ? '#2563eb' : '#374151',
                      fontWeight: sortConfig.key === 'newFile' ? 600 : 'normal'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    New PDF {renderSortIcon('newFile')}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filterConfig.newFile || ''}
                  onChange={(e) => handleFilter('newFile', e.target.value)}
                  style={{ 
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </th>
              <th style={{ 
                width: '20%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
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
              </th>
              <th style={{ 
                width: '15%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <button 
                    onClick={() => handleSort('time')}
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
                      color: sortConfig.key === 'time' ? '#2563eb' : '#374151',
                      fontWeight: sortConfig.key === 'time' ? 600 : 'normal'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Time (ms) {renderSortIcon('time')}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filterConfig.time || ''}
                  onChange={(e) => handleFilter('time', e.target.value)}
                  style={{ 
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </th>
              <th style={{ 
                width: '15%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                textAlign: 'center'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedResults.map((result, index) => (
              <tr key={result.id} style={{ 
                background: index % 2 === 0 ? '#fff' : '#f9fafb',
                transition: 'background-color 0.2s'
              }}>
                <td style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  {result.oldFileName}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  {result.newFileName}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    background: result.overallResult === 'Pass' ? '#dcfce7' : '#fee2e2',
                    color: result.overallResult === 'Pass' ? '#166534' : '#991b1b'
                  }}>
                    {result.overallResult}
                  </span>
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  {result.executionTime}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  textAlign: 'center'
                }}>
                  <button 
                    onClick={() => handleViewClick(result.id)}
                    disabled={loading}
                    style={{ 
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#374151',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#e5e7eb';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f3f4f6';
                    }}
                  >
                    🔍 View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{ 
          color: '#991b1b',
          background: '#fee2e2',
          padding: '12px 16px',
          borderRadius: '6px',
          marginTop: '16px',
          fontSize: '0.875rem'
        }}>
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