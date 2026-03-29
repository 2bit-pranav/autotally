import scribe from "scribe.js-ocr";

self.onmessage = async function (e) {
    const { fileData, fileName, mimeType, workerId } = e.data;

    try {
        // Convert file data to File object for Scribe
        const blob = new Blob([fileData], { type: mimeType || "application/octet-stream" });
        const file = new File([blob], fileName, { type: mimeType || "application/octet-stream" });

        // Extract text using Scribe.js
        const result = await scribe.extractText([file]);

        // Send success response
        self.postMessage({
            success: true,
            fileName: fileName,
            text: result,
            workerId: workerId,
        });
    } catch (error) {
        // Send error response
        self.postMessage({
            success: false,
            fileName: fileName,
            error: error.message || "OCR processing failed",
            workerId: workerId,
        });
    }
};

// Cleanup on termination
self.addEventListener("close", async () => {
    try {
        await scribe.terminate();
    } catch (err) {
        console.error("Error terminating Scribe worker:", err);
    }
});
