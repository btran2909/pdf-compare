import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ComparisonResult } from '../types';

interface PDFComparisonViewerProps {
  comparisonResult: ComparisonResult;
  onClose: () => void;
}

interface PDFPage {
  pageNumber: number;
  content: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  differences: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'added' | 'removed' | 'modified';
  }>;
}

interface PDFComparisonResponse {
  oldPages: PDFPage[];
  newPages: PDFPage[];
}

const PDFComparisonViewer: React.FC<PDFComparisonViewerProps> = ({ comparisonResult, onClose }) => {
  const [oldPDFPages, setOldPDFPages] = useState<PDFPage[]>([]);
  const [newPDFPages, setNewPDFPages] = useState<PDFPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [syncScroll, setSyncScroll] = useState(true);
  
  const oldPdfRef = useRef<HTMLDivElement>(null);
  const newPdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPDFData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<PDFComparisonResponse>(`http://localhost:5050/api/pdf-comparison/${comparisonResult.id}`);
        setOldPDFPages(response.data.oldPages);
        setNewPDFPages(response.data.newPages);
      } catch (err) {
        setError('Failed to load PDF comparison data');
        console.error('Error fetching PDF data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPDFData();
  }, [comparisonResult.id]);

  const handleScroll = (source: 'old' | 'new') => {
    if (!syncScroll) return;
    
    const sourceRef = source === 'old' ? oldPdfRef.current : newPdfRef.current;
    const targetRef = source === 'old' ? newPdfRef.current : oldPdfRef.current;
    
    if (sourceRef && targetRef) {
      targetRef.scrollTop = sourceRef.scrollTop;
      targetRef.scrollLeft = sourceRef.scrollLeft;
    }
  };

  const renderPDFPage = (page: PDFPage, isOld: boolean) => {
    if (!page) return null;

    return (
      <div
        key={page.pageNumber}
        style={{
          position: 'relative',
          margin: '20px auto',
          backgroundColor: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          minHeight: '800px',
          padding: '20px',
          border: '1px solid #e5e7eb'
        }}
      >
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          Page {page.pageNumber} - {isOld ? 'Old PDF' : 'New PDF'}
        </div>
        
        <div style={{ position: 'relative' }}>
          {page.content.map((item, index) => {
            const difference = page.differences?.find(diff => 
              Math.abs(diff.x - item.x) < 5 && Math.abs(diff.y - item.y) < 5
            );
            
            let highlightStyle = {};
            if (difference) {
              switch (difference.type) {
                case 'added':
                  highlightStyle = { backgroundColor: '#dcfce7', border: '2px solid #22c55e' };
                  break;
                case 'removed':
                  highlightStyle = { backgroundColor: '#fee2e2', border: '2px solid #ef4444' };
                  break;
                case 'modified':
                  highlightStyle = { backgroundColor: '#fef3c7', border: '2px solid #f59e0b' };
                  break;
              }
            }

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  fontSize: `${item.height}px`,
                  lineHeight: `${item.height}px`,
                  whiteSpace: 'nowrap',
                  ...highlightStyle,
                  padding: difference ? '2px' : '0',
                  borderRadius: difference ? '3px' : '0'
                }}
              >
                {item.str}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Loading PDF comparison...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '400px'
        }}>
          <div style={{
            color: '#dc2626',
            marginBottom: '16px'
          }}>{error}</div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6b7280'}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '100%',
        height: '100%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600'
            }}>PDF Comparison</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              <span>Old: {comparisonResult.oldFileName}</span>
              <span>|</span>
              <span>New: {comparisonResult.newFileName}</span>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <label style={{ fontSize: '14px' }}>Sync Scroll:</label>
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <label style={{ fontSize: '14px' }}>Zoom:</label>
              <select
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '14px'
                }}
              >
                <option value={0.5}>50%</option>
                <option value={0.75}>75%</option>
                <option value={1}>100%</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
              </select>
            </div>
            
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6b7280'}
            >
              Close
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '14px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#dcfce7',
              border: '2px solid #22c55e'
            }}></div>
            <span>Added</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#fee2e2',
              border: '2px solid #ef4444'
            }}></div>
            <span>Removed</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b'
            }}></div>
            <span>Modified</span>
          </div>
        </div>

        {/* PDF Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden'
        }}>
          {/* Old PDF */}
          <div style={{
            width: '50%',
            borderRight: '1px solid #e5e7eb',
            overflow: 'auto'
          }}>
            <div
              ref={oldPdfRef}
              onScroll={() => handleScroll('old')}
              style={{
                height: '100%',
                overflow: 'auto'
              }}
            >
              {oldPDFPages.map(page => renderPDFPage(page, true))}
            </div>
          </div>

          {/* New PDF */}
          <div style={{
            width: '50%',
            overflow: 'auto'
          }}>
            <div
              ref={newPdfRef}
              onScroll={() => handleScroll('new')}
              style={{
                height: '100%',
                overflow: 'auto'
              }}
            >
              {newPDFPages.map(page => renderPDFPage(page, false))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFComparisonViewer; 