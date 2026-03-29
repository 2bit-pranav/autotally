import React from "react";
import "./LandingPage.css";

export default function LandingPage({ onStart }) {
    return (
        <div>
            <nav className="navbar">
                <h1 className="logo">AutoTally</h1>
                <button className="btn-primary" onClick={onStart}>
                    Get Started
                </button>
            </nav>

            <div className="hero">
                <h2 className="hero-title">Automate Tally Data Entry</h2>
                <p className="hero-sub">
                    Upload invoices, extract data with AI, map your ledgers, and
                    sync directly to Tally Prime in seconds.
                </p>
                <button
                    className="btn-primary"
                    style={{ fontSize: "18px", padding: "15px 30px" }}
                    onClick={onStart}
                >
                    Start Processing
                </button>
            </div>

            <div className="features-grid">
                <div className="feature-card">
                    <h3>📄 AI Extraction</h3>
                    <p style={{ color: "#aaa" }}>
                        Instantly pull line items, GST, and amounts from any
                        format.
                    </p>
                </div>
                <div className="feature-card">
                    <h3>🧠 Smart Mapping</h3>
                    <p style={{ color: "#aaa" }}>
                        Map extracted terms to your official Tally ledgers
                        seamlessly.
                    </p>
                </div>
                <div className="feature-card">
                    <h3>⚡ 1-Click Sync</h3>
                    <p style={{ color: "#aaa" }}>
                        Push XML directly to Tally Prime without manual
                        exports.
                    </p>
                </div>
            </div>

            <footer>
                <p>© 2026 AutoTally. All rights reserved.</p>
            </footer>
        </div>
    );
}
