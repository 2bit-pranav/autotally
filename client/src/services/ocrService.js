// OCR Service for parallel invoice processing using Web Workers

const WORKER_COUNT = 4; // Number of parallel workers
const CHUNK_SIZE = 12; // Files per chunk

class OCRService {
    constructor() {
        this.workers = [];
        this.currentChunk = 0;
        this.results = [];
        this.errors = [];
    }

    // Initialize worker pool
    initWorkers() {
        for (let i = 0; i < WORKER_COUNT; i++) {
            const worker = new Worker(
                new URL("../workers/ocrWorker.js", import.meta.url),
                { type: "module" },
            );
            this.workers.push(worker);
        }
    }

    // Split files into chunks for processing
    createChunks(files, chunkSize = CHUNK_SIZE) {
        const chunks = [];
        for (let i = 0; i < files.length; i += chunkSize) {
            chunks.push(files.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // Process a batch of files with progress callbacks
    async processFileBatch(files, onProgress, onFileComplete) {
        return new Promise(async (resolve, reject) => {
            if (files.length === 0) {
                resolve({ results: [], errors: [] });
                return;
            }

            this.results = [];
            this.errors = [];
            this.initWorkers();

            const chunks = this.createChunks(files);
            let completedCount = 0;
            const totalFiles = files.length;

            // Process each chunk in parallel using available workers
            const processChunk = async (chunk, workerIndex) => {
                const worker = this.workers[workerIndex];

                for (const file of chunk) {
                    try {
                        // Convert file to ArrayBuffer for transfer
                        const arrayBuffer = await file.rawFile.arrayBuffer();

                        // Send file to worker
                        const result = await new Promise(
                            (fileResolve, fileReject) => {
                                const timeout = setTimeout(() => {
                                    fileReject(
                                        new Error("OCR timeout exceeded"),
                                    );
                                }, 30000); // 30 second timeout per file

                                worker.onmessage = (e) => {
                                    clearTimeout(timeout);
                                    fileResolve(e.data);
                                };

                                worker.onerror = (error) => {
                                    clearTimeout(timeout);
                                    fileReject(error);
                                };

                                worker.postMessage({
                                    fileData: arrayBuffer,
                                    fileName: file.name,
                                    mimeType: file.rawFile.type,
                                    workerId: workerIndex,
                                });
                            },
                        );

                        completedCount++;

                        if (result.success) {
                            this.results.push({
                                name: file.name,
                                text: result.text,
                                status: "completed",
                            });

                            // Call file completion callback
                            if (onFileComplete) {
                                onFileComplete({
                                    name: file.name,
                                    status: "completed",
                                    text: result.text,
                                });
                            }
                        } else {
                            this.errors.push({
                                name: file.name,
                                error: result.error,
                                status: "failed",
                            });

                            // Call file completion callback with error
                            if (onFileComplete) {
                                onFileComplete({
                                    name: file.name,
                                    status: "failed",
                                    error: result.error,
                                });
                            }
                        }

                        // Update progress
                        if (onProgress) {
                            onProgress({
                                completed: completedCount,
                                total: totalFiles,
                                current: file.name,
                                percentage: Math.round(
                                    (completedCount / totalFiles) * 100,
                                ),
                            });
                        }
                    } catch (error) {
                        completedCount++;
                        this.errors.push({
                            name: file.name,
                            error: error.message,
                            status: "failed",
                        });

                        if (onFileComplete) {
                            onFileComplete({
                                name: file.name,
                                status: "failed",
                                error: error.message,
                            });
                        }

                        if (onProgress) {
                            onProgress({
                                completed: completedCount,
                                total: totalFiles,
                                current: file.name,
                                percentage: Math.round(
                                    (completedCount / totalFiles) * 100,
                                ),
                            });
                        }
                    }
                }
            };

            // Process all chunks in parallel with available workers
            try {
                const chunkPromises = chunks.map((chunk, index) =>
                    processChunk(chunk, index % WORKER_COUNT),
                );

                await Promise.all(chunkPromises);

                // Terminate all workers
                this.terminateWorkers();

                resolve({
                    results: this.results,
                    errors: this.errors,
                });
            } catch (error) {
                this.terminateWorkers();
                reject(error);
            }
        });
    }

    // Cleanup workers
    terminateWorkers() {
        this.workers.forEach((worker) => {
            try {
                worker.terminate();
            } catch (err) {
                console.error("Error terminating worker:", err);
            }
        });
        this.workers = [];
    }
}

export const processFileBatch = async (files, onProgress, onFileComplete) => {
    const service = new OCRService();
    return await service.processFileBatch(files, onProgress, onFileComplete);
};
