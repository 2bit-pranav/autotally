import React, { useState, useMemo } from "react";
import "./FileIngestion.css";
import axios from "axios";

export default function FileIngestion({ onAnalyze }) {
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const compressImage = async (file) => {
        if (file.type === "application/pdf") return file;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    
                    // width cap at 1500px
                    const MAX_WIDTH = 1500;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                        }));
                    }, "image/jpeg", 0.7);
                };
            };
        });
    };

    const handleUpload = (e) => {
        if (!e.target.files) return;
        const uploadedFiles = Array.from(e.target.files);

        const newFiles = uploadedFiles
            .filter((newFile) => !files.some((existing) => existing.name === newFile.name))
            .map((file) => ({
                id: file.name,
                name: file.name,
                size: file.size,
                rawFile: file,
            }));

        setFiles((prev) => [...prev, ...newFiles]);
        e.target.value = null;
    };

    const handleDeleteSelected = () => {
        setFiles((prev) => prev.filter((f) => !selectedFiles.includes(f.id)));
        setSelectedFiles([]);
    };

    const handleCheckboxChange = (id) => {
        setSelectedFiles((prev) =>
            prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id],
        );
    };

    const filteredFiles = useMemo(() => {
        return files.filter((f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [files, searchQuery]);

    const isAllSelected = filteredFiles.length > 0 && filteredFiles.every((f) => selectedFiles.includes(f.id));

    const handleSelectAll = () => {
        if (isAllSelected) {
            const filteredIds = filteredFiles.map((f) => f.id);
            setSelectedFiles((prev) => prev.filter((id) => !filteredIds.includes(id)));
        } else {
            const filteredIds = filteredFiles.map((f) => f.id);
            setSelectedFiles((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const executeAnalysis = async () => {
        setIsAnalyzing(true);
        
        try {
            const formData = new FormData();
            
            // 1. compress and append to FormData
            for (const f of files) {
                const compressedFile = await compressImage(f.rawFile);
                formData.append("invoiceFiles", compressedFile);
            }

            // 2. post to /analyze
            const response = await axios.post("http://localhost:8080/api/v1/analyze", formData);
            const apiResponse = response.data;
            
            // 3. handle 200 OK responses
            if (apiResponse.success) {
                const extractedInvoiceData = JSON.parse(apiResponse.data); 
                console.log(extractedInvoiceData);
                onAnalyze(extractedInvoiceData); 
            } else {
                alert(`Analysis Failed: ${apiResponse.message}\n${apiResponse.errorDetail || ""}`);
                setIsAnalyzing(false); 
            }

        } catch (error) {
            console.error("API call failed:", error);
            
            // Handle Axios 4xx/5xx HTTP Exceptions properly
            if (error.response && error.response.data) {
                const apiError = error.response.data;
                alert(`Analysis Error: ${apiError.message || "Server Exception"}\n${apiError.errorDetail || ""}`);
            } else {
                // Total network failure (backend not reachable)
                alert("Network error: Could not connect to localhost:8080. Ensure your backend is running.");
            }
            setIsAnalyzing(false);
        }
    };

    // analyzing state
    if (isAnalyzing) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <h2>Analyzing {files.length} invoices. Please wait...</h2>
            </div>
        );
    }

    // upload state
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

    // grid state
    return (
        <div className="ingestion-container">
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

            <table className="file-table">
                <thead>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                                disabled={filteredFiles.length === 0}
                                style={{ cursor: "pointer" }}
                            />
                        </th>
                        <th>File Name</th>
                        <th style={{ width: "120px" }}>Size</th>
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
                </tbody>
            </table>

            <div className="actions-footer">
                <button className="btn btn-primary" onClick={executeAnalysis}>
                    Analyze All ({files.length} Files)
                </button>
            </div>
        </div>
    );
}