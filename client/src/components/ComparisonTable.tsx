import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { ComparisonResult } from '../types';
import ComparisonModal from './ComparisonModal';
import PDFComparisonViewer from './PDFComparisonViewer';
import ErrorModal from './ErrorModal';
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
  const [selectedPDFComparison, setSelectedPDFComparison] = useState<ComparisonResult | null>(null);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});

  const handleViewClick = async (result: ComparisonResult) => {
    if (result.overallResult === 'Error' && result.error) {
      setSelectedError(result.error);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5050/api/comparison/${result.id}`);
      setSelectedResult(response.data as ComparisonResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison details');
    } finally {
      setLoading(false);
    }
  };

  const handlePDFComparisonClick = (result: ComparisonResult) => {
    setSelectedPDFComparison(result);
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
              itemValue = item?.oldFileName || '';
              break;
            case 'newFile':
              itemValue = item?.newFileName || '';
              break;
            case 'status':
              itemValue = item?.overallResult || '';
              break;
            case 'time':
              itemValue = item?.executionTime?.toString() || '0';
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
            aValue = a?.oldFileName || '';
            bValue = b?.oldFileName || '';
            break;
          case 'newFile':
            aValue = a?.newFileName || '';
            bValue = b?.newFileName || '';
            break;
          case 'status':
            aValue = a?.overallResult || '';
            bValue = b?.overallResult || '';
            break;
          case 'time':
            aValue = a?.executionTime || 0;
            bValue = b?.executionTime || 0;
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
                    valueAccessor={(item) => item?.oldFileName || ''}
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
                    valueAccessor={(item) => item?.newFileName || ''}
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
                    valueAccessor={(item) => item?.overallResult || ''}
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
                    valueAccessor={(item) => item?.executionTime?.toString() || '0'}
                    selectedValues={filterConfig.time || new Set()}
                    onFilterChange={(values) => handleFilter('time', values)}
                    alignRight
                  />
                </div>
              </th>
              <th style={{
                width: '12%',
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
                  Actions
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedResults.map((result, index) => (
              <tr key={result.id || index} style={{
                background: index % 2 === 0 ? '#fff' : '#f9fafb',
                transition: 'background 0.2s',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb',
                  wordBreak: 'break-word',
                }}>
                  {result?.oldFileName || 'N/A'}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb',
                  wordBreak: 'break-word',
                }}>
                  {result?.newFileName || 'N/A'}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: result.overallResult === 'Pass' ? '#dcfce7' : '#fee2e2',
                    color: result.overallResult === 'Pass' ? '#166534' : '#991b1b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px',
                    cursor: result.error ? 'help' : 'default'
                  }}
                    title={result.error}
                  >
                    {result.overallResult === 'Error'
                      ? result.error?.split(':')[0]
                      : result.overallResult || 'Unknown'}
                  </span>
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  {`${result?.executionTime || 0} ms`}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center'
                  }}>
                    <button 
                      onClick={() => handleViewClick(result)}
                      disabled={!result.id && !result.error}
                      style={{
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
                    >
                      Details
                    </button>
                    <button 
                      onClick={() => handlePDFComparisonClick(result)}
                      disabled={result.overallResult === 'Error'}
                      style={{
                        background: '#3b82f6',
                        border: '1px solid #2563eb',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        color: 'white',
                        transition: 'all 0.2s',
                        cursor: result.overallResult === 'Error' ? 'not-allowed' : 'pointer',
                        opacity: result.overallResult === 'Error' ? 0.5 : 1
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                      onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                    >
                      Compare PDFs
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .status-pill:hover .tooltip {
          display: block;
        }
      `}</style>

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

      {selectedPDFComparison && (
        <PDFComparisonViewer
          comparisonResult={selectedPDFComparison}
          onClose={() => setSelectedPDFComparison(null)}
        />
      )}

      {selectedError && (
        <ErrorModal
          error={selectedError}
          onClose={() => setSelectedError(null)}
        />
      )}
    </div>
  );
};

export default ComparisonTable; 