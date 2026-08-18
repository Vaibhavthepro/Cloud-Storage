"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const ChunkUploadService_1 = require("./services/ChunkUploadService");
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const server = app_1.default.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize and start background cleanup task
    const chunkUploadService = new ChunkUploadService_1.ChunkUploadService();
    console.log('Starting background cleanup job for abandoned chunk uploads...');
    // Run once on startup
    chunkUploadService.cleanupAbandonedUploads().catch((err) => {
        console.error('Error running initial chunk cleanup:', err);
    });
    // Run every hour
    setInterval(() => {
        console.log('Running scheduled chunk upload cleanup...');
        chunkUploadService.cleanupAbandonedUploads().catch((err) => {
            console.error('Error running scheduled chunk cleanup:', err);
        });
    }, 60 * 60 * 1000);
});
