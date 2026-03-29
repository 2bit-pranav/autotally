// 1. store all the uploaded files
// 2. run ocr through them and store text data
// 3. send the text array to the backend

import React, { useState } from "react";
import LandingPage from "./components/LandingPage";
import AppLayout from "./components/AppLayout";
import "./App.css";

export default function App() {
    const [isAppActive, setIsAppActive] = useState(false);
    
    if (!isAppActive) return <LandingPage onStart={() => setIsAppActive(true)} />;
    return <AppLayout onExit={() => setIsAppActive(false)} />;
}
