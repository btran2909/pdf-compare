import React, { useState, useMemo } from 'react';
import { ComparisonResult } from '../types';
import { ColumnFilterPopover } from './ColumnFilterPopover';

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
  [key: string]: Set<string>;
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
    Object.entries(filterConfig).forEach(([key, values]) => {
      if (values.size > 0) {
        comparisons = comparisons.filter(item => {
          let itemValue = '';
          switch (key) {
            case 'page':
              itemValue = item.page.toString();
              break;
            case 'line':
              itemValue = item.line.toString();
              break;
            case 'old':
              itemValue = item.value.old || '';
              break;
            case 'new':
              itemValue = item.value.new || '';
              break;
            case 'status':
              itemValue = item.value.result || '';
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
          padding: '5px 24px',
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
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#111827' }}>Special Fields</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Field</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Old Value</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>New Value</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {specialFields.map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{key}</td>
                      <td style={{ padding: '12px' }}>{value.old}</td>
                      <td style={{ padding: '12px' }}>{value.new}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: value.result === 'Pass' ? '#dcfce7' : '#fee2e2',
                          color: value.result === 'Pass' ? '#166534' : '#991b1b'
                        }}>
                          {value.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Line Comparisons Section */}
          <div>
            <h4 style={{ margin: '0 0 16px 0', color: '#111827' }}>Line Comparisons</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ 
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleSort('page')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          color: sortConfig.key === 'page' ? '#2563eb' : '#374151',
                          fontWeight: sortConfig.key === 'page' ? 600 : 'normal'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        Page {renderSortIcon('page')}
                      </button>
                      <ColumnFilterPopover
                        columnKey="page"
                        data={lineComparisons}
                        valueAccessor={(item) => item.page.toString()}
                        selectedValues={filterConfig.page || new Set()}
                        onFilterChange={(values) => handleFilter('page', values)}
                      />
                    </div>
                  </th>
                  <th style={{ 
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleSort('line')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          color: sortConfig.key === 'line' ? '#2563eb' : '#374151',
                          fontWeight: sortConfig.key === 'line' ? 600 : 'normal'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        Line {renderSortIcon('line')}
                      </button>
                      <ColumnFilterPopover
                        columnKey="line"
                        data={lineComparisons}
                        valueAccessor={(item) => item.line.toString()}
                        selectedValues={filterConfig.line || new Set()}
                        onFilterChange={(values) => handleFilter('line', values)}
                      />
                    </div>
                  </th>
                  <th style={{ 
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleSort('old')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          color: sortConfig.key === 'old' ? '#2563eb' : '#374151',
                          fontWeight: sortConfig.key === 'old' ? 600 : 'normal'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        Old Value {renderSortIcon('old')}
                      </button>
                      <ColumnFilterPopover
                        columnKey="old"
                        data={lineComparisons}
                        valueAccessor={(item) => item.value.old || ''}
                        selectedValues={filterConfig.old || new Set()}
                        onFilterChange={(values) => handleFilter('old', values)}
                      />
                    </div>
                  </th>
                  <th style={{ 
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleSort('new')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          color: sortConfig.key === 'new' ? '#2563eb' : '#374151',
                          fontWeight: sortConfig.key === 'new' ? 600 : 'normal'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        New Value {renderSortIcon('new')}
                      </button>
                      <ColumnFilterPopover
                        columnKey="new"
                        data={lineComparisons}
                        valueAccessor={(item) => item.value.new || ''}
                        selectedValues={filterConfig.new || new Set()}
                        onFilterChange={(values) => handleFilter('new', values)}
                      />
                    </div>
                  </th>
                  <th style={{ 
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleSort('status')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
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
                        data={lineComparisons}
                        valueAccessor={(item) => item.value.result || ''}
                        selectedValues={filterConfig.status || new Set()}
                        onFilterChange={(values) => handleFilter('status', values)}
                        alignRight
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineComparisons.map((comparison) => (
                  <tr key={comparison.fullKey} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>{comparison.page}</td>
                    <td style={{ padding: '12px' }}>{comparison.line}</td>
                    <td style={{ padding: '12px' }}>{comparison.value.old}</td>
                    <td style={{ padding: '12px' }}>{comparison.value.new}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: comparison.value.result === 'Pass' ? '#dcfce7' : '#fee2e2',
                        color: comparison.value.result === 'Pass' ? '#166534' : '#991b1b'
                      }}>
                        {comparison.value.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal; 