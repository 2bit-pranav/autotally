// import React, { useState, useMemo } from "react";
// import axios from "axios";
// import "./LedgerMapper.css";

// export default function LedgerMapper({ extractedInvoiceData = [], onComplete }) {
//     // --- WORKFLOW STATES ---
//     const [viewState, setViewState] = useState("setup");
//     const [targetCompany, setTargetCompany] = useState("");
//     const [isHelpOpen, setIsHelpOpen] = useState(false);
//     const [isExporting, setIsExporting] = useState(false);

//     // --- DATA STATES ---
//     const [tallyLedgers, setTallyLedgers] = useState([]);

//     // --- MAPPING STATES ---
//     const [extractedSearch, setExtractedSearch] = useState("");
//     const [tallySearch, setTallySearch] = useState("");
//     const [selectedExtracted, setSelectedExtracted] = useState(null);
//     const [selectedTally, setSelectedTally] = useState(null);
//     const [mappedPairs, setMappedPairs] = useState([]);
//     const [missingLedgers, setMissingLedgers] = useState([]);
//     const [isMissingOpen, setIsMissingOpen] = useState(false);
    
//     const [showValidationError, setShowValidationError] = useState(false);

//     // --- DERIVED DATA ---
//     const extractedLedgers = useMemo(() => {
//         if (!extractedInvoiceData || extractedInvoiceData.length === 0) return [];

//         const allPartyNames = extractedInvoiceData
//             .map((invoice) => invoice["PARTY_NAME"])
//             .filter((name) => name && name.trim() !== "");

//         const uniqueParties = Array.from(new Set(allPartyNames));
//         const mappedExtracted = new Set(mappedPairs.map((pair) => pair.extracted));
//         const missingSet = new Set(missingLedgers);

//         return uniqueParties.filter(
//             (ledger) => !mappedExtracted.has(ledger) && !missingSet.has(ledger),
//         );
//     }, [extractedInvoiceData, mappedPairs, missingLedgers]);

//     // --- LOGIC: Fetch Tally Ledgers ---
//     const handleFetchLedgers = async () => {
//         if (!targetCompany.trim()) return;
//         setViewState("fetching");

//         try {
//             const response = await axios.post(
//                 "http://localhost:8080/api/v1/get-ledgers",
//                 null,
//                 { params: { targetCompany: targetCompany.trim() } }
//             );

//             const apiResponse = response.data;

//             if (apiResponse.success && apiResponse.data) {
//                 const ledgerMap = apiResponse.data; 
//                 const formattedLedgers = [];

//                 Object.entries(ledgerMap).forEach(([categoryName, ledgersObj]) => {
//                     Object.keys(ledgersObj).forEach((ledgerName) => {
//                         formattedLedgers.push({ 
//                             name: ledgerName, 
//                             category: categoryName 
//                         });
//                     });
//                 });

//                 setTallyLedgers(formattedLedgers);
//                 setViewState("mapping");
//             } else {
//                 alert(`Could not retrieve ledgers: ${apiResponse.message}`);
//                 setViewState("setup");
//             }
//         } catch (error) {
//             console.error("Ledger fetch error:", error);
//             alert("Network error: Could not reach backend.");
//             setViewState("setup");
//         }
//     };

//     // --- MAPPING LOGIC ---
//     const filteredExtracted = useMemo(() => 
//         extractedLedgers.filter((l) => l.toLowerCase().includes(extractedSearch.toLowerCase())),
//     [extractedLedgers, extractedSearch]);

//     const filteredTally = useMemo(() => {
//         const lowerSearch = tallySearch.toLowerCase();
//         return tallyLedgers.filter((l) => 
//             l.name.toLowerCase().includes(lowerSearch) || 
//             l.category.toLowerCase().includes(lowerSearch)
//         );
//     }, [tallyLedgers, tallySearch]);

//     const groupedTally = useMemo(() => {
//         return filteredTally.reduce((acc, curr) => {
//             if (!acc[curr.category]) acc[curr.category] = [];
//             acc[curr.category].push(curr.name);
//             return acc;
//         }, {});
//     }, [filteredTally]);

//     const handleMap = () => {
//         if (!selectedExtracted || !selectedTally) return;
//         setMappedPairs((prev) => [...prev, { extracted: selectedExtracted, tally: selectedTally }]);
//         setSelectedExtracted(null);
//         setSelectedTally(null);
//         setShowValidationError(false);
//     };

//     const handleMarkMissing = () => {
//         if (!selectedExtracted) return;
//         setMissingLedgers((prev) => [...prev, selectedExtracted]);
//         setSelectedExtracted(null);
//         if (!isMissingOpen) setIsMissingOpen(true);
//         setShowValidationError(false);
//     };

//     const handleUndoMissing = (ledger) => {
//         setMissingLedgers((prev) => prev.filter((l) => l !== ledger));
//         if (missingLedgers.length === 1) setIsMissingOpen(false);
//     };

//     // --- LOGIC: Generate XMLs and Hand Off ---
//     const handleConfirmAndContinue = async () => {
//         if (extractedLedgers.length > 0) {
//             setShowValidationError(true);
//             setTimeout(() => setShowValidationError(false), 3500);
//             return;
//         }

//         setIsExporting(true); // Show spinner while waiting for XML strings

//         try {
//             const mappedSet = [];
//             const missingSet = [];

//             extractedInvoiceData.forEach(invoice => {
//                 const originalName = invoice["PARTY_NAME"];
//                 if (missingLedgers.includes(originalName)) {
//                     missingSet.push(invoice);
//                 } else {
//                     const mapping = mappedPairs.find(m => m.extracted === originalName);
//                     if (mapping) {
//                         mappedSet.push({ ...invoice, "PARTY_NAME": mapping.tally });
//                     }
//                 }
//             });

//             const queryParams = new URLSearchParams({
//                 targetCompany: targetCompany.trim(),
//                 invoiceType: "Sales", 
//                 cgstLedger: "Cgst 9%",
//                 sgstLedger: "Sgst 9%",
//                 igstLedger: "Igst 18%"
//             }).toString();

//             let missingXml = null;
//             let mappedXml = null;

//             // 1. Fetch XML string for missing ledgers (if any)
//             if (missingSet.length > 0) {
//                 const missingRes = await axios.post(`http://localhost:8080/api/v1/generate-voucher-xml?${queryParams}`, missingSet);
//                 missingXml = missingRes.data.data;
//             }

//             // 2. Fetch XML string for mapped ledgers (if any)
//             if (mappedSet.length > 0) {
//                 const mappedRes = await axios.post(`http://localhost:8080/api/v1/generate-voucher-xml?${queryParams}`, mappedSet);
//                 mappedXml = mappedRes.data.data;
//             }

//             // 3. Hand everything off to the parent/final component
//             onComplete({ 
//                 mappedPairs, 
//                 missingLedgers, 
//                 targetCompany,
//                 mappedXml,   // The final component will push this
//                 missingXml,  // The final component will download this
//                 mappedCount: mappedSet.length,
//                 missingCount: missingSet.length
//             });

//         } catch (error) {
//             console.error("XML Generation failed:", error);
//             alert("A fatal error occurred while generating XML. Check the console.");
//             setIsExporting(false); // Only unlock if it fails. If success, parent unmounts this component anyway.
//         }
//     };

//     // --- RENDER VIEWS ---
//     if (viewState === "setup") {
//         return (
//             <div className="setup-container">
//                 <div className="success-banner">
//                     <span style={{ fontSize: "20px" }}>✅</span>
//                     <div>
//                         <strong>Analysis Successful!</strong><br />
//                         {extractedInvoiceData.length} invoices were successfully processed and formatted.
//                     </div>
//                 </div>

//                 <div className="tally-banner">
//                     <span style={{ fontSize: "20px" }}>⚠️</span>
//                     <div style={{ flex: 1 }}>
//                         <strong>Action Required</strong><br />
//                         Ensure Tally Prime is running locally and Client/Server configuration is active on port 9000.
//                         <div className="help-collapsible">
//                             <div className="help-header" onClick={() => setIsHelpOpen(!isHelpOpen)}>
//                                 <span>How to do it?</span>
//                                 <span className={`collapsible-icon ${isHelpOpen ? "open" : ""}`}>▼</span>
//                             </div>
//                             <div className={`help-content ${isHelpOpen ? "open" : ""}`}>
//                                 <ol>
//                                     <li>In Tally Prime, press <strong>F1 (Help)</strong>.</li>
//                                     <li>Go to <strong>Settings &gt; Connectivity &gt; Client/Server Configuration</strong>.</li>
//                                     <li>Set <em>TallyPrime acts as</em> to <strong>Both</strong>.</li>
//                                     <li>Set <em>Enable ODBC</em> to <strong>Yes</strong>.</li>
//                                     <li>Set <em>Port</em> to <strong>9000</strong>.</li>
//                                     <li>Save and restart Tally if prompted.</li>
//                                 </ol>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <h2>Connect to Company</h2>
//                 <p style={{ color: "#aaa", marginBottom: "30px" }}>
//                     We found <strong>{extractedLedgers.length} unique parties</strong> across {extractedInvoiceData.length} invoices. Enter your Tally company name to fetch your master ledgers for mapping.
//                 </p>
//                 <div className="setup-input-group">
//                     <label>Target Company Name (Exact Match)</label>
//                     <input
//                         type="text"
//                         placeholder="e.g. My Global Enterprise Pvt Ltd"
//                         value={targetCompany}
//                         onChange={(e) => setTargetCompany(e.target.value)}
//                     />
//                 </div>
//                 <button
//                     className="btn btn-primary"
//                     style={{ width: "100%", padding: "12px", fontSize: "16px" }}
//                     onClick={handleFetchLedgers}
//                     disabled={!targetCompany.trim()}
//                 >
//                     Fetch Master Ledgers
//                 </button>
//             </div>
//         );
//     }

//     if (viewState === "fetching") {
//         return (
//             <div className="loading-container">
//                 <div className="spinner"></div>
//                 <h2>Retrieving master ledgers from Tally Prime...</h2>
//             </div>
//         );
//     }

//     if (isExporting) {
//         return (
//             <div className="loading-container">
//                 <div className="spinner"></div>
//                 <h2>Compiling Tally XML payloads...</h2>
//             </div>
//         );
//     }

//     return (
//         <div className="mapper-container">
//             <div className="mapper-header">
//                 <h2>Analyzed {extractedInvoiceData.length} invoices</h2>
//                 <p style={{ color: "#aaa", margin: 0 }}>
//                     Map the AI-extracted terms to your official Tally Prime ledgers.
//                 </p>
//             </div>

//             <div className={`mapper-grid ${showValidationError ? "validation-error" : ""}`}>
//                 {/* LEFT PANE */}
//                 <div className="list-panel">
//                     <div className="panel-header">Extracted ledgers</div>
//                     <div className="panel-search">
//                         <input
//                             type="text"
//                             placeholder="Search extracted..."
//                             value={extractedSearch}
//                             onChange={(e) => setExtractedSearch(e.target.value)}
//                         />
//                     </div>
//                     <div className="list-items">
//                         {filteredExtracted.map((ledger) => (
//                             <div
//                                 key={ledger}
//                                 className={`list-item ${selectedExtracted === ledger ? "selected" : ""}`}
//                                 onClick={() => setSelectedExtracted(ledger)}
//                             >
//                                 {ledger}
//                             </div>
//                         ))}
//                         {filteredExtracted.length === 0 && (
//                             <div style={{ color: "#666", textAlign: "center", marginTop: "20px" }}>
//                                 All caught up!
//                             </div>
//                         )}
//                     </div>
//                 </div>

//                 {/* CENTER ACTION */}
//                 <div className="map-action">
//                     <button
//                         className="map-btn"
//                         disabled={!selectedExtracted || !selectedTally}
//                         onClick={handleMap}
//                     >
//                         →
//                     </button>
//                 </div>

//                 {/* RIGHT PANE */}
//                 <div className="list-panel">
//                     <div className="panel-header">Tally ledgers</div>
//                     <div className="panel-search">
//                         <input
//                             type="text"
//                             placeholder="Search name or category..."
//                             value={tallySearch}
//                             onChange={(e) => setTallySearch(e.target.value)}
//                         />
//                     </div>
//                     <div className="list-items">
//                         {Object.entries(groupedTally).map(([category, ledgers]) => (
//                             <div key={category}>
//                                 <div className="tally-category-header">{category}</div>
//                                 {ledgers.map((ledgerName) => (
//                                     <div
//                                         key={ledgerName}
//                                         className={`list-item ${selectedTally === ledgerName ? "selected" : ""}`}
//                                         onClick={() => setSelectedTally(ledgerName)}
//                                         style={{ marginLeft: "10px" }} 
//                                     >
//                                         {ledgerName}
//                                     </div>
//                                 ))}
//                             </div>
//                         ))}
//                         {Object.keys(groupedTally).length === 0 && (
//                             <div style={{ color: "#666", textAlign: "center", marginTop: "20px" }}>
//                                 No matching ledgers found.
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             <div className="queue-panel">
//                 <h3 style={{ margin: "0 0 10px 0", color: showValidationError ? "#dc3545" : "white" }}>
//                     {extractedLedgers.length} ledgers left to map
//                 </h3>
//                 <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>
//                     Select an extracted ledger above. If it doesn't exist in
//                     Tally, mark it as missing to generate an XML for creation.
//                 </p>

//                 <label className="missing-checkbox">
//                     <input
//                         type="checkbox"
//                         disabled={!selectedExtracted}
//                         onChange={handleMarkMissing}
//                         checked={false}
//                     />
//                     Mark <strong>{selectedExtracted || "selected item"}</strong>{" "}
//                     as missing instead? XML will be generated.
//                 </label>

//                 {missingLedgers.length > 0 && (
//                     <div className="missing-collapsible">
//                         <div
//                             className="collapsible-header"
//                             onClick={() => setIsMissingOpen(!isMissingOpen)}
//                         >
//                             <p className="collapsible-title">
//                                 ⚠️ {missingLedgers.length} Ledgers marked for XML generation
//                             </p>
//                             <span className={`collapsible-icon ${isMissingOpen ? "open" : ""}`}>▼</span>
//                         </div>

//                         <div className={`collapsible-content ${isMissingOpen ? "open" : ""}`}>
//                             {missingLedgers.map((missingItem) => (
//                                 <div key={missingItem} className="missing-item">
//                                     <span>{missingItem}</span>
//                                     <button className="undo-btn" onClick={() => handleUndoMissing(missingItem)}>
//                                         Undo
//                                     </button>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}
//             </div>

//             <div style={{ textAlign: "right", marginTop: "30px" }}>
//                 <div className="confirm-wrapper">
//                     {showValidationError && (
//                         <div className="validation-tooltip">
//                             ⚠️ Please map all ledgers or mark them as missing.
//                         </div>
//                     )}
//                     <button
//                         className="btn btn-primary"
//                         style={{ padding: "12px 24px", fontSize: "16px" }}
//                         onClick={handleConfirmAndContinue}
//                         disabled={isExporting}
//                     >
//                         Confirm & Continue
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }

import React, { useState, useMemo } from "react";
import axios from "axios";
import "./LedgerMapper.css";

export default function LedgerMapper({ extractedInvoiceData = [], onComplete }) {
    // --- WORKFLOW STATES ---
    const [viewState, setViewState] = useState("setup");
    const [targetCompany, setTargetCompany] = useState("");
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // --- DATA STATES ---
    const [tallyLedgers, setTallyLedgers] = useState([]);

    // --- MAPPING STATES ---
    const [extractedSearch, setExtractedSearch] = useState("");
    const [tallySearch, setTallySearch] = useState("");
    const [selectedExtracted, setSelectedExtracted] = useState(null);
    const [selectedTally, setSelectedTally] = useState(null);
    const [mappedPairs, setMappedPairs] = useState([]);
    const [missingLedgers, setMissingLedgers] = useState([]);
    const [isMissingOpen, setIsMissingOpen] = useState(false);
    
    const [showValidationError, setShowValidationError] = useState(false);

    // --- DERIVED DATA ---
    const extractedLedgers = useMemo(() => {
        if (!extractedInvoiceData || extractedInvoiceData.length === 0) return [];

        const allPartyNames = extractedInvoiceData
            .map((invoice) => invoice["PARTY_NAME"])
            .filter((name) => name && name.trim() !== "");

        const uniqueParties = Array.from(new Set(allPartyNames));
        const mappedExtracted = new Set(mappedPairs.map((pair) => pair.extracted));
        const missingSet = new Set(missingLedgers);

        return uniqueParties.filter(
            (ledger) => !mappedExtracted.has(ledger) && !missingSet.has(ledger),
        );
    }, [extractedInvoiceData, mappedPairs, missingLedgers]);

    // --- LOGIC: Fetch Tally Ledgers ---
    const handleFetchLedgers = async () => {
        if (!targetCompany.trim()) return;
        setViewState("fetching");

        try {
            const response = await axios.post(
                "http://localhost:8080/api/v1/get-ledgers",
                null,
                { params: { targetCompany: targetCompany.trim() } }
            );

            const apiResponse = response.data;

            if (apiResponse.success && apiResponse.data) {
                const ledgerMap = apiResponse.data; 
                const formattedLedgers = [];

                Object.entries(ledgerMap).forEach(([categoryName, ledgersObj]) => {
                    Object.keys(ledgersObj).forEach((ledgerName) => {
                        formattedLedgers.push({ 
                            name: ledgerName, 
                            category: categoryName 
                        });
                    });
                });

                setTallyLedgers(formattedLedgers);
                setViewState("mapping");
            } else {
                alert(`Could not retrieve ledgers: ${apiResponse.message}`);
                setViewState("setup");
            }
        } catch (error) {
            console.error("Ledger fetch error:", error);
            alert("Network error: Could not reach backend.");
            setViewState("setup");
        }
    };

    // --- MAPPING LOGIC ---
    const filteredExtracted = useMemo(() => 
        extractedLedgers.filter((l) => l.toLowerCase().includes(extractedSearch.toLowerCase())),
    [extractedLedgers, extractedSearch]);

    const filteredTally = useMemo(() => {
        const lowerSearch = tallySearch.toLowerCase();
        return tallyLedgers.filter((l) => 
            l.name.toLowerCase().includes(lowerSearch) || 
            l.category.toLowerCase().includes(lowerSearch)
        );
    }, [tallyLedgers, tallySearch]);

    const groupedTally = useMemo(() => {
        return filteredTally.reduce((acc, curr) => {
            if (!acc[curr.category]) acc[curr.category] = [];
            acc[curr.category].push(curr.name);
            return acc;
        }, {});
    }, [filteredTally]);

    const handleMap = () => {
        if (!selectedExtracted || !selectedTally) return;
        setMappedPairs((prev) => [...prev, { extracted: selectedExtracted, tally: selectedTally }]);
        setSelectedExtracted(null);
        setSelectedTally(null);
        setShowValidationError(false);
    };

    const handleMarkMissing = () => {
        if (!selectedExtracted) return;
        setMissingLedgers((prev) => [...prev, selectedExtracted]);
        setSelectedExtracted(null);
        if (!isMissingOpen) setIsMissingOpen(true);
        setShowValidationError(false);
    };

    const handleUndoMissing = (ledger) => {
        setMissingLedgers((prev) => prev.filter((l) => l !== ledger));
        if (missingLedgers.length === 1) setIsMissingOpen(false);
    };

    // --- LOGIC: Generate XMLs and Hand Off ---
    const handleConfirmAndContinue = async () => {
        if (extractedLedgers.length > 0) {
            setShowValidationError(true);
            setTimeout(() => setShowValidationError(false), 3500);
            return;
        }

        setIsExporting(true); // Show spinner while waiting for XML strings

        try {
            const mappedSet = [];
            const missingSet = [];

            extractedInvoiceData.forEach(invoice => {
                const originalName = invoice["PARTY_NAME"];
                if (missingLedgers.includes(originalName)) {
                    missingSet.push(invoice);
                } else {
                    const mapping = mappedPairs.find(m => m.extracted === originalName);
                    if (mapping) {
                        mappedSet.push({ ...invoice, "PARTY_NAME": mapping.tally });
                    }
                }
            });

            const queryParams = new URLSearchParams({
                targetCompany: targetCompany.trim(),
                invoiceType: "Sales", 
                cgstLedger: "Cgst 9%",
                sgstLedger: "Sgst 9%",
                igstLedger: "Igst 18%"
            }).toString();

            let missingXml = null;
            let mappedXml = null;

            // 1. Fetch XML string for missing ledgers (if any)
            if (missingSet.length > 0) {
                const missingRes = await axios.post(`http://localhost:8080/api/v1/generate-voucher-xml?${queryParams}`, missingSet);
                missingXml = missingRes.data.data;
            }

            // 2. Fetch XML string for mapped ledgers (if any)
            if (mappedSet.length > 0) {
                const mappedRes = await axios.post(`http://localhost:8080/api/v1/generate-voucher-xml?${queryParams}`, mappedSet);
                const rawMappedXml = mappedRes.data.data;
                
                // CLEANUP: Minify the mapped XML right here so the pipeline holds the exact string to push
                mappedXml = rawMappedXml
                    .replace(/\\n/g, '')  // Removes literal string "\n"
                    .replace(/\n/g, '')   // Removes actual line breaks
                    .replace(/\r/g, '')   // Removes carriage returns
                    .replace(/\t/g, '');  // Removes tabs
            }

            // 3. Hand everything off to the parent/final component
            onComplete({ 
                mappedPairs, 
                missingLedgers, 
                targetCompany,
                mappedXml,   // Minified, ready for /push-vouchers
                missingXml,  // Formatted, ready for download
                mappedCount: mappedSet.length,
                missingCount: missingSet.length
            });

        } catch (error) {
            console.error("XML Generation failed:", error);
            alert("A fatal error occurred while generating XML. Check the console.");
            setIsExporting(false); 
        }
    };

    // --- RENDER VIEWS ---
    if (viewState === "setup") {
        return (
            <div className="setup-container">
                <div className="success-banner">
                    <span style={{ fontSize: "20px" }}>✅</span>
                    <div>
                        <strong>Analysis Successful!</strong><br />
                        {extractedInvoiceData.length} invoices were successfully processed and formatted.
                    </div>
                </div>

                <div className="tally-banner">
                    <span style={{ fontSize: "20px" }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                        <strong>Action Required</strong><br />
                        Ensure Tally Prime is running locally and Client/Server configuration is active on port 9000.
                        <div className="help-collapsible">
                            <div className="help-header" onClick={() => setIsHelpOpen(!isHelpOpen)}>
                                <span>How to do it?</span>
                                <span className={`collapsible-icon ${isHelpOpen ? "open" : ""}`}>▼</span>
                            </div>
                            <div className={`help-content ${isHelpOpen ? "open" : ""}`}>
                                <ol>
                                    <li>In Tally Prime, press <strong>F1 (Help)</strong>.</li>
                                    <li>Go to <strong>Settings &gt; Connectivity &gt; Client/Server Configuration</strong>.</li>
                                    <li>Set <em>TallyPrime acts as</em> to <strong>Both</strong>.</li>
                                    <li>Set <em>Enable ODBC</em> to <strong>Yes</strong>.</li>
                                    <li>Set <em>Port</em> to <strong>9000</strong>.</li>
                                    <li>Save and restart Tally if prompted.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                <h2>Connect to Company</h2>
                <p style={{ color: "#aaa", marginBottom: "30px" }}>
                    We found <strong>{extractedLedgers.length} unique parties</strong> across {extractedInvoiceData.length} invoices. Enter your Tally company name to fetch your master ledgers for mapping.
                </p>
                <div className="setup-input-group">
                    <label>Target Company Name (Exact Match)</label>
                    <input
                        type="text"
                        placeholder="e.g. My Global Enterprise Pvt Ltd"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                    />
                </div>
                <button
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "12px", fontSize: "16px" }}
                    onClick={handleFetchLedgers}
                    disabled={!targetCompany.trim()}
                >
                    Fetch Master Ledgers
                </button>
            </div>
        );
    }

    if (viewState === "fetching") {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <h2>Retrieving master ledgers from Tally Prime...</h2>
            </div>
        );
    }

    if (isExporting) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <h2>Compiling Tally XML payloads...</h2>
            </div>
        );
    }

    return (
        <div className="mapper-container">
            <div className="mapper-header">
                <h2>Analyzed {extractedInvoiceData.length} invoices</h2>
                <p style={{ color: "#aaa", margin: 0 }}>
                    Map the AI-extracted terms to your official Tally Prime ledgers.
                </p>
            </div>

            <div className={`mapper-grid ${showValidationError ? "validation-error" : ""}`}>
                {/* LEFT PANE */}
                <div className="list-panel">
                    <div className="panel-header">Extracted ledgers</div>
                    <div className="panel-search">
                        <input
                            type="text"
                            placeholder="Search extracted..."
                            value={extractedSearch}
                            onChange={(e) => setExtractedSearch(e.target.value)}
                        />
                    </div>
                    <div className="list-items">
                        {filteredExtracted.map((ledger) => (
                            <div
                                key={ledger}
                                className={`list-item ${selectedExtracted === ledger ? "selected" : ""}`}
                                onClick={() => setSelectedExtracted(ledger)}
                            >
                                {ledger}
                            </div>
                        ))}
                        {filteredExtracted.length === 0 && (
                            <div style={{ color: "#666", textAlign: "center", marginTop: "20px" }}>
                                All caught up!
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER ACTION */}
                <div className="map-action">
                    <button
                        className="map-btn"
                        disabled={!selectedExtracted || !selectedTally}
                        onClick={handleMap}
                    >
                        →
                    </button>
                </div>

                {/* RIGHT PANE */}
                <div className="list-panel">
                    <div className="panel-header">Tally ledgers</div>
                    <div className="panel-search">
                        <input
                            type="text"
                            placeholder="Search name or category..."
                            value={tallySearch}
                            onChange={(e) => setTallySearch(e.target.value)}
                        />
                    </div>
                    <div className="list-items">
                        {Object.entries(groupedTally).map(([category, ledgers]) => (
                            <div key={category}>
                                <div className="tally-category-header">{category}</div>
                                {ledgers.map((ledgerName) => (
                                    <div
                                        key={ledgerName}
                                        className={`list-item ${selectedTally === ledgerName ? "selected" : ""}`}
                                        onClick={() => setSelectedTally(ledgerName)}
                                        style={{ marginLeft: "10px" }} 
                                    >
                                        {ledgerName}
                                    </div>
                                ))}
                            </div>
                        ))}
                        {Object.keys(groupedTally).length === 0 && (
                            <div style={{ color: "#666", textAlign: "center", marginTop: "20px" }}>
                                No matching ledgers found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="queue-panel">
                <h3 style={{ margin: "0 0 10px 0", color: showValidationError ? "#dc3545" : "white" }}>
                    {extractedLedgers.length} ledgers left to map
                </h3>
                <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>
                    Select an extracted ledger above. If it doesn't exist in
                    Tally, mark it as missing to generate an XML for creation.
                </p>

                <label className="missing-checkbox">
                    <input
                        type="checkbox"
                        disabled={!selectedExtracted}
                        onChange={handleMarkMissing}
                        checked={false}
                    />
                    Mark <strong>{selectedExtracted || "selected item"}</strong>{" "}
                    as missing instead? XML will be generated.
                </label>

                {missingLedgers.length > 0 && (
                    <div className="missing-collapsible">
                        <div
                            className="collapsible-header"
                            onClick={() => setIsMissingOpen(!isMissingOpen)}
                        >
                            <p className="collapsible-title">
                                ⚠️ {missingLedgers.length} Ledgers marked for XML generation
                            </p>
                            <span className={`collapsible-icon ${isMissingOpen ? "open" : ""}`}>▼</span>
                        </div>

                        <div className={`collapsible-content ${isMissingOpen ? "open" : ""}`}>
                            {missingLedgers.map((missingItem) => (
                                <div key={missingItem} className="missing-item">
                                    <span>{missingItem}</span>
                                    <button className="undo-btn" onClick={() => handleUndoMissing(missingItem)}>
                                        Undo
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ textAlign: "right", marginTop: "30px" }}>
                <div className="confirm-wrapper">
                    {showValidationError && (
                        <div className="validation-tooltip">
                            ⚠️ Please map all ledgers or mark them as missing.
                        </div>
                    )}
                    <button
                        className="btn btn-primary"
                        style={{ padding: "12px 24px", fontSize: "16px" }}
                        onClick={handleConfirmAndContinue}
                        disabled={isExporting}
                    >
                        Confirm & Continue
                    </button>
                </div>
            </div>
        </div>
    );
}