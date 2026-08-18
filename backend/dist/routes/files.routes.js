"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const os_1 = __importDefault(require("os"));
const files_controller_1 = require("../controllers/files.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: os_1.default.tmpdir() }); // Store temp files in OS temp dir
router.use(auth_middleware_1.authenticate);
// Legacy upload
router.post('/upload', upload.single('file'), files_controller_1.uploadFile);
// Chunk upload flow
router.post('/upload/init', files_controller_1.initiateChunkUpload);
router.get('/upload/status', files_controller_1.getChunkUploadStatus);
router.post('/upload/chunk', files_controller_1.uploadChunk);
router.post('/upload/complete', files_controller_1.completeChunkUpload);
router.post('/upload/cancel', files_controller_1.cancelChunkUpload);
router.get('/', files_controller_1.getFiles);
router.get('/:id/download', files_controller_1.downloadFile);
router.delete('/:id', files_controller_1.deleteFile);
router.patch('/:id/star', files_controller_1.toggleStarFile);
exports.default = router;
