import React, { useState } from "react";
import FileIngestion from "./FileIngestion.jsx";
import LedgerMapper from "./LedgerMapper.jsx";
import Result from "./Result.jsx";
import "./AppLayout.css";

export default function AppLayout({ onExit }) {
    const [currentStep, setCurrentStep] = useState(1);

    // Master state to pass data between components
    const [pipelineData, setPipelineData] = useState({
        files: [],
        mappedLedgers: [],
    });

    // --- Step Handlers ---
    const handleIngestionComplete = (files) => {
        setPipelineData((prev) => ({ ...prev, files }));
        setCurrentStep(2); // Move to Mapping
    };

    const handleMappingComplete = (mappedData) => {
        setPipelineData((prev) => ({ ...prev, mappedLedgers: mappedData }));
        setCurrentStep(3); // Move to Final Result
    };

    const handleStartOver = () => {
        setCurrentStep(1);
        setPipelineData({ files: [], mappedLedgers: [] });
    };

    const styles = {
        progressSegment: (stepIndex) => ({
            flex: 1,
            height: "6px",
            borderRadius: "3px",
            backgroundColor: currentStep >= stepIndex ? "#007bff" : "#333",
            transition: "background-color 0.3s ease",
        }),
    };

    return (
        <div className="layout">
            {/* Top Header & Progress Bar */}
            <div className="header">
                <h2 style={{ margin: 0 }}>AutoTally</h2>

                <div className="progress-bar-container">
                    <div style={styles.progressSegment(1)} />
                    <div style={styles.progressSegment(2)} />
                    <div style={styles.progressSegment(3)} />
                </div>

                <button className="exit-btn" onClick={onExit}>
                    Exit App
                </button>
            </div>

            {/* Dynamic Component Rendering */}
            {currentStep === 1 && (
                <FileIngestion onAnalyze={handleIngestionComplete} />
            )}

            {currentStep === 2 && (
                <LedgerMapper
                    extractedInvoiceData={pipelineData.files}
                    onComplete={handleMappingComplete}
                />
            )}

            {currentStep === 3 && (
                <Result data={pipelineData} onStartOver={handleStartOver} />
            )}
        </div>
    );
}
