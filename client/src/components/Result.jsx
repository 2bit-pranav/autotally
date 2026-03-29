// import React, { useState } from "react";
// import axios from "axios";
// import "./Result.css";

// export default function Result({ data, onStartOver }) {
//     const [isSyncing, setIsSyncing] = useState(false);
//     const [syncSuccess, setSyncSuccess] = useState(false);

//     // --- LOGIC: Push to Tally ---
//     const handlePush = async () => {
//         if (!data.mappedXml || data.mappedCount === 0) {
//             alert("No mapped data available to push.");
//             return;
//         }

//         setIsSyncing(true);

//         try {
//             // BULLETPROOFING: Strip out actual newlines, carriage returns, and the literal string "\n"
//             const cleanXmlPayload = data.mappedXml
//                 .replace(/\\n/g, '')  // Removes literal string "\n"
//                 .replace(/\n/g, '')   // Removes actual line breaks
//                 .replace(/\r/g, '')   // Removes carriage returns
//                 .replace(/\t/g, '');  // Removes tabs (optional, but saves bandwidth)

//             const response = await axios.post(
//                 "http://localhost:8080/api/v1/push-vouchers",
//                 cleanXmlPayload, 
//                 {
//                     headers: { "Content-Type": "application/xml" }
//                 }
//             );

//             const apiResponse = response.data;

//             if (apiResponse.success) {
//                 setSyncSuccess(true);
//             } else {
//                 alert(`Sync Failed: ${apiResponse.message}\n${apiResponse.errorDetail || ""}`);
//             }
//         } catch (error) {
//             console.error("Push to Tally failed:", error);
//             if (error.response && error.response.data) {
//                 const apiError = error.response.data;
//                 alert(`Error: ${apiError.message || "Operation Failed"}\n${apiError.errorDetail || ""}`);
//             } else {
//                 alert("Network error: Could not reach backend /api/v1/push-vouchers. Check if Spring Boot is running.");
//             }
//         } finally {
//             setIsSyncing(false);
//         }
//     };

//     // --- LOGIC: Download Missing XML ---
//     const handleDownload = () => {
//         if (!data.missingXml || data.missingCount === 0) {
//             alert("No missing ledgers to download.");
//             return;
//         }

//         // The \n characters in data.missingXml will naturally format this file perfectly
//         const blob = new Blob([data.missingXml], { type: "application/xml" });
//         const url = URL.createObjectURL(blob);
        
//         const link = document.createElement("a");
//         link.href = url;
//         link.download = `missing_ledgers_${data.targetCompany.replace(/\s+/g, '_')}.xml`; // Nice dynamic filename
//         document.body.appendChild(link);
//         link.click();
        
//         // Cleanup
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//     };

//     // --- RENDER STATES ---

//     if (isSyncing) {
//         return (
//             <div className="container" style={{ textAlign: "center", padding: "60px 20px" }}>
//                 <div className="spinner" style={{ margin: "0 auto 20px auto" }}></div>
//                 <h2 className="title">Syncing with Tally Prime...</h2>
//                 <p className="subtitle">Pushing {data.mappedCount} vouchers to Tally</p>
//             </div>
//         );
//     }

//     if (syncSuccess) {
//         return (
//             <div className="container" style={{ textAlign: "center" }}>
//                 <div className="icon" style={{ color: "#28a745" }}>🎉</div>
//                 <h2 className="title">Sync Complete!</h2>
//                 <p className="subtitle">
//                     <strong>{data.mappedCount}</strong> vouchers were successfully pushed to Tally Prime.
//                 </p>
//                 <button className="start-over" onClick={onStartOver} style={{ marginTop: "30px" }}>
//                     Process another batch
//                 </button>
//             </div>
//         );
//     }

//     return (
//         <div className="container">
//             <div className="icon">✅</div>
//             <h2 className="title">Ready to Import</h2>
//             <p className="subtitle">
//                 Analysis complete for <strong>{data.targetCompany}</strong>. <br /><br />
//                 • <strong>{data.mappedCount}</strong> vouchers are fully mapped and ready to sync. <br />
//                 • <strong>{data.missingCount}</strong> vouchers contain missing ledgers and require manual creation.
//             </p>

//             <div className="btn-group">
//                 <button 
//                     className="primary-btn" 
//                     onClick={handlePush}
//                     disabled={data.mappedCount === 0}
//                     style={{ opacity: data.mappedCount === 0 ? 0.5 : 1, cursor: data.mappedCount === 0 ? "not-allowed" : "pointer" }}
//                 >
//                     Push to Tally Prime ({data.mappedCount})
//                 </button>
                
//                 <button 
//                     className="secondary-btn" 
//                     onClick={handleDownload}
//                     disabled={data.missingCount === 0}
//                     style={{ opacity: data.missingCount === 0 ? 0.5 : 1, cursor: data.missingCount === 0 ? "not-allowed" : "pointer" }}
//                 >
//                     Download Missing XML ({data.missingCount})
//                 </button>
//             </div>

//             <button className="start-over" onClick={onStartOver}>
//                 Start Over
//             </button>
//         </div>
//     );
// }

import React, { useState } from "react";
import axios from "axios";
import "./Result.css";

export default function Result({ data, onStartOver }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    
    // NEW: Education Mode State
    const [isEduMode, setIsEduMode] = useState(false);

    const finalData = data.mappedLedgers || {};
    const targetCompany = finalData.targetCompany || "Unknown Company";
    const mappedCount = finalData.mappedCount || 0;
    const missingCount = finalData.missingCount || 0;
    const mappedXml = finalData.mappedXml || null;
    const missingXml = finalData.missingXml || null;

    // Dynamically calculate 1st April of (Current Year - 1)
    const eduDate = `01/04/${new Date().getFullYear() - 1}`;

    // --- LOGIC: Push to Tally ---
    const handlePush = async () => {
        if (!mappedXml || mappedCount === 0) {
            alert("No mapped data available to push.");
            return;
        }

        setIsSyncing(true);

        try {
            // 1. Clean up any escaped quotes from JSON parsing
            let payloadToPush = mappedXml.replace(/\\"/g, '"').trim();

            // 2. EDUCATION MODE OVERRIDE: Replace all <DATE> values using Regex
            if (isEduMode) {
                // Finds <DATE>anything</DATE> and replaces it with <DATE>01/04/YYYY</DATE>
                payloadToPush = payloadToPush.replace(/<DATE>.*?<\/DATE>/g, `<DATE>${eduDate}</DATE>`);
            }

            const response = await axios.post(
                "http://localhost:8080/api/v1/push-vouchers",
                payloadToPush, 
                {
                    headers: { "Content-Type": "application/xml; charset=utf-8" }
                }
            );

            const apiResponse = response.data;

            if (apiResponse.success) {
                setSyncSuccess(true);
            } else {
                alert(`Sync Failed: ${apiResponse.message}\n${apiResponse.errorDetail || ""}`);
            }
        } catch (error) {
            console.error("Push to Tally failed:", error);
            if (error.response && error.response.data) {
                const apiError = error.response.data;
                alert(`Error: ${apiError.message || "Operation Failed"}\n${apiError.errorDetail || ""}`);
            } else {
                alert("Network error: Could not reach backend /api/v1/push-vouchers. Check if Spring Boot is running.");
            }
        } finally {
            setIsSyncing(false);
        }
    };

    // --- LOGIC: Download Missing XML ---
    const handleDownload = () => {
        if (!missingXml || missingCount === 0) {
            alert("No missing ledgers to download.");
            return;
        }

        const blob = new Blob([missingXml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        const safeCompanyName = targetCompany.replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `missing_ledgers_${safeCompanyName}.xml`; 
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // --- RENDER STATES ---

    if (isSyncing) {
        return (
            <div className="container" style={{ textAlign: "center", padding: "60px 20px" }}>
                <div className="spinner" style={{ margin: "0 auto 20px auto" }}></div>
                <h2 className="title">Syncing with Tally Prime...</h2>
                <p className="subtitle">Pushing {mappedCount} vouchers to {targetCompany}</p>
            </div>
        );
    }

    if (syncSuccess) {
        return (
            <div className="container" style={{ textAlign: "center" }}>
                <div className="icon" style={{ color: "#28a745", fontSize: "48px" }}>🎉</div>
                <h2 className="title">Sync Complete!</h2>
                <p className="subtitle">
                    <strong>{mappedCount}</strong> vouchers were successfully pushed to Tally Prime.
                </p>
                <button className="start-over" onClick={onStartOver} style={{ marginTop: "30px", cursor: "pointer" }}>
                    Process another batch
                </button>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="icon">✅</div>
            <h2 className="title">Ready to Import</h2>
            <p className="subtitle">
                Analysis complete for <strong>{targetCompany}</strong>. <br /><br />
                • <strong>{mappedCount}</strong> vouchers are fully mapped and ready to sync. <br />
                • <strong>{missingCount}</strong> vouchers contain missing ledgers and require manual creation.
            </p>

            {/* NEW: Education Mode Toggle */}
            <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#1a1a1b", border: "1px dashed #444", borderRadius: "8px", textAlign: "left" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", color: "#ccc", fontSize: "14px" }}>
                    <input 
                        type="checkbox" 
                        checked={isEduMode} 
                        onChange={(e) => setIsEduMode(e.target.checked)} 
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    Overwrite dates to <strong>{eduDate}</strong> (Tally Education Mode Support)
                </label>
            </div>

            <div className="btn-group">
                <button 
                    className="primary-btn" 
                    onClick={handlePush}
                    disabled={mappedCount === 0}
                    style={{ opacity: mappedCount === 0 ? 0.5 : 1, cursor: mappedCount === 0 ? "not-allowed" : "pointer" }}
                >
                    Push to Tally Prime ({mappedCount})
                </button>
                
                <button 
                    className="secondary-btn" 
                    onClick={handleDownload}
                    disabled={missingCount === 0}
                    style={{ opacity: missingCount === 0 ? 0.5 : 1, cursor: missingCount === 0 ? "not-allowed" : "pointer" }}
                >
                    Download Missing XML ({missingCount})
                </button>
            </div>

            <button className="start-over" onClick={onStartOver} style={{ cursor: "pointer" }}>
                Start Over
            </button>
        </div>
    );
}