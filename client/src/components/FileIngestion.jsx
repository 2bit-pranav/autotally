import React, { useState, useMemo } from 'react';
import './FileIngestion.css'; // Make sure this matches your CSS filename

export default function FileIngestion({ onAnalyze }) {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // --- LOGIC ---
  const handleUpload = (e) => {
    if (!e.target.files) return;
    const uploadedFiles = Array.from(e.target.files);
    
    const newFiles = uploadedFiles
      .filter(newFile => !files.some(existing => existing.name === newFile.name))
      .map(file => ({
        id: file.name,
        name: file.name,
        size: file.size,
        rawFile: file
      }));
    
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = null; 
  };

  const handleDeleteSelected = () => {
    setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
    setSelectedFiles([]); 
  };

  const handleCheckboxChange = (id) => {
    setSelectedFiles(prev => 
      prev.includes(id) ? prev.filter(fileId => fileId !== id) : [...prev, id]
    );
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  // --- Check if all *visible* files are currently selected ---
  const isAllSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedFiles.includes(f.id));

  // --- Master Toggle ---
  const handleSelectAll = () => {
    if (isAllSelected) {
      // If all are checked, uncheck the currently filtered ones
      const filteredIds = filteredFiles.map(f => f.id);
      setSelectedFiles(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // If not all are checked, check them all
      const filteredIds = filteredFiles.map(f => f.id);
      setSelectedFiles(prev => {
        // Use a Set to combine previous selections with new ones without duplicates
        const combined = new Set([...prev, ...filteredIds]);
        return Array.from(combined);
      });
    }
  };

  // --- RENDER ---

  // State 1: Dropzone
  if (files.length === 0) {
    return (
      <div className="dropzone">
        <h2>Upload Invoices for AutoTally</h2>
        <p>Select PDF, PNG, or JPG files to begin</p>
        <label>
          Select Files
          <input type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} />
        </label>
      </div>
    );
  }

  // State 2: Data Table
  return (
    <div className="ingestion-container">
      
      {/* Top Controls */}
      <div className="controls-header">
        <input 
          type="text" 
          className="search-input"
          placeholder="Search files..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="button-group">
          <button 
            className="btn btn-danger"
            onClick={handleDeleteSelected}
            disabled={selectedFiles.length === 0}
          >
            Delete Selected ({selectedFiles.length})
          </button>
          
          <label className="btn btn-success">
            + Add More
            <input type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* The Native Table */}
      <table className="file-table">
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={handleSelectAll}
                disabled={filteredFiles.length === 0}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th>File Name</th>
            <th style={{ width: '120px' }}>Size</th>
          </tr>
        </thead>
        <tbody>
          {filteredFiles.map((file) => (
            <tr key={file.id}>
              <td>
                <input 
                  type="checkbox" 
                  checked={selectedFiles.includes(file.id)}
                  onChange={() => handleCheckboxChange(file.id)}
                />
              </td>
              <td>{file.name}</td>
              <td>{(file.size / (1024 * 1024)).toFixed(2)} MB</td>
            </tr>
          ))}
          {filteredFiles.length === 0 && (
            <tr>
              <td colSpan="3" className="empty-state">No files found matching "{searchQuery}".</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Bottom Action */}
      <div className="actions-footer">
        <button 
          className="btn btn-primary"
          onClick={() => onAnalyze(files.map(f => f.rawFile))}
        >
          Analyze All ({files.length} Files)
        </button>
      </div>

    </div>
  );
}