import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { ComparisonResult } from '../types';
import ComparisonModal from './ComparisonModal';
import { ColumnFilterPopover } from './ColumnFilterPopover';

interface ComparisonTableProps {
  results: ComparisonResult[];
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: Set<string>;
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

  const handleFilter = (key: string, values: Set<string>) => {
    setFilterConfig(prev => ({
      ...prev,
      [key]: values
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
    Object.entries(filterConfig).forEach(([key, values]) => {
      if (values.size > 0) {
        filtered = filtered.filter(item => {
          let itemValue = '';
          switch (key) {
            case 'oldFile':
              itemValue = item.oldFileName;
              break;
            case 'newFile':
              itemValue = item.newFileName;
              break;
            case 'status':
              itemValue = item.overallResult;
              break;
            case 'time':
              itemValue = item.executionTime.toString();
              break;
            default:
              return true;
          }
          return values.has(itemValue);
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
                width: '22%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleSort('oldFile')}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
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
                  <ColumnFilterPopover
                    columnKey="oldFile"
                    data={results}
                    valueAccessor={(item) => item.oldFileName}
                    selectedValues={filterConfig.oldFile || new Set()}
                    onFilterChange={(values) => handleFilter('oldFile', values)}
                  />
                </div>
              </th>
              <th style={{ 
                width: '22%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleSort('newFile')}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
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
                  <ColumnFilterPopover
                    columnKey="newFile"
                    data={results}
                    valueAccessor={(item) => item.newFileName}
                    selectedValues={filterConfig.newFile || new Set()}
                    onFilterChange={(values) => handleFilter('newFile', values)}
                  />
                </div>
              </th>
              <th style={{ 
                width: '18%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleSort('status')}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
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
                  <ColumnFilterPopover
                    columnKey="status"
                    data={results}
                    valueAccessor={(item) => item.overallResult}
                    selectedValues={filterConfig.status || new Set()}
                    onFilterChange={(values) => handleFilter('status', values)}
                  />
                </div>
              </th>
              <th style={{ 
                width: '14%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleSort('time')}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                      color: sortConfig.key === 'time' ? '#2563eb' : '#374151',
                      fontWeight: sortConfig.key === 'time' ? 600 : 'normal'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Time {renderSortIcon('time')}
                  </button>
                  <ColumnFilterPopover
                    columnKey="time"
                    data={results}
                    valueAccessor={(item) => item.executionTime.toString()}
                    selectedValues={filterConfig.time || new Set()}
                    onFilterChange={(values) => handleFilter('time', values)}
                    alignRight
                  />
                </div>
              </th>
              <th style={{
                width: '8%',
                padding: '12px 16px',
                borderBottom: '2px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'normal',
                  fontSize: '0.875rem',
                  color: '#374151',
                  height: '100%'
                }}>
                  Action
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedResults.map((result, index) => (
              <tr key={index} style={{ 
                borderBottom: index < filteredAndSortedResults.length - 1 ? '1px solid #e5e7eb' : 'none'
              }}>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {result.oldFileName}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {result.newFileName}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: result.overallResult === 'Pass' ? '#dcfce7' : '#fee2e2',
                    color: result.overallResult === 'Pass' ? '#166534' : '#991b1b'
                  }}>
                    {result.overallResult}
                  </span>
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'monospace'
                }}>
                  {result.executionTime}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  textAlign: 'center'
                }}>
                  <button
                    onClick={() => handleViewClick(result.id)}
                    style={{
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
                  >
                    View
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