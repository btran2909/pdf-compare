import React, { useState, useEffect, useRef } from 'react';
import { FiFilter } from 'react-icons/fi';

interface ColumnFilterPopoverProps {
  columnKey: string;
  data: any[];
  valueAccessor: (item: any) => string | number;
  selectedValues: Set<string>;
  onFilterChange: (values: Set<string>) => void;
  alignRight?: boolean;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  columnKey,
  data,
  valueAccessor,
  selectedValues,
  onFilterChange,
  alignRight = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get unique values from data
  const uniqueValues = Array.from(new Set(data.map(valueAccessor)))
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  // Filter values based on search term
  const filteredValues = uniqueValues.filter(value =>
    String(value).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClickOutside = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleValue = (value: string | number) => {
    const newValues = new Set(selectedValues);
    if (newValues.has(String(value))) {
      newValues.delete(String(value));
    } else {
      newValues.add(String(value));
    }
    onFilterChange(newValues);
  };

  const handleSelectAll = () => {
    const newValues = new Set(filteredValues.map(String));
    onFilterChange(newValues);
  };

  const handleClear = () => {
    onFilterChange(new Set());
  };

  const FilterIcon = FiFilter as React.ComponentType<any>;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: selectedValues.size > 0 ? '#e5e7eb' : 'transparent',
          border: 'none',
          borderRadius: '4px',
          padding: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={`Filter ${columnKey}`}
      >
        {React.createElement(FilterIcon, {
          size: 16,
          color: selectedValues.size > 0 ? '#2563eb' : '#6b7280',
        })}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: alignRight ? undefined : 0,
            right: alignRight ? 0 : undefined,
            marginTop: '4px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            minWidth: '220px',
            width: 'max-content',
            maxWidth: '350px',
            zIndex: 1000,
            overflow: 'visible',
          }}
        >
          <div style={{ padding: '12px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              style={{
                width: '95%',
                padding: '6px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            />

            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              marginBottom: '8px',
              padding: '4px'
            }}>
              {filteredValues.map((value) => (
                <label
                  key={String(value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 0',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.has(String(value))}
                    onChange={() => handleToggleValue(value)}
                    style={{ marginRight: '8px' }}
                  />
                  {String(value)}
                </label>
              ))}
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '8px'
            }}>
              <button
                onClick={handleSelectAll}
                style={{
                  flex: 1,
                  padding: '6px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Select All
              </button>
              <button
                onClick={handleClear}
                style={{
                  flex: 1,
                  padding: '6px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 