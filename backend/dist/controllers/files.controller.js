"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleStarFile = exports.deleteFile = exports.downloadFile = exports.getFiles = exports.cancelChunkUpload = exports.completeChunkUpload = exports.uploadChunk = exports.getChunkUploadStatus = exports.initiateChunkUpload = exports.uploadFile = void 0;
const FileService_1 = require("../services/FileService");
const ChunkUploadService_1 = require("../services/ChunkUploadService");
const AppError_1 = require("../utils/AppError");
const db_1 = __importDefault(require("../config/db"));
const permissions_1 = require("../utils/permissions");
const fileService = new FileService_1.FileService();
const chunkUploadService = new ChunkUploadService_1.ChunkUploadService();
const uploadFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return next(new AppError_1.AppError('No file uploaded', 400));
        }
        const { folderId } = req.body;
        const userId = req.user.id;
        // Check storage quota
        let user = yield db_1.default.user.findUnique({ where: { id: userId } });
        if (user) {
            const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);
            if (user.storageQuota < defaultQuota) {
                user = yield db_1.default.user.update({
                    where: { id: userId },
                    data: { storageQuota: defaultQuota }
                });
            }
            if (user.storageUsed + BigInt(req.file.size) > user.storageQuota) {
                return next(new AppError_1.AppError('Storage quota exceeded', 400));
            }
        }
        const fileRecord = yield fileService.handleUpload(userId, req.file, folderId);
        // Convert BigInt for JSON serialization
        const responseFile = Object.assign(Object.assign({}, fileRecord), { size: fileRecord.size.toString() });
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            data: responseFile
        });
    }
    catch (error) {
        next(error);
    }
});
exports.uploadFile = uploadFile;
const initiateChunkUpload = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename, size, mimeType, folderId } = req.body;
        const userId = req.user.id;
        if (!filename || size === undefined || !mimeType) {
            return next(new AppError_1.AppError('Filename, size, and mimeType are required', 400));
        }
        const sessionInfo = yield chunkUploadService.initiateUpload(userId, filename, parseInt(size, 10), mimeType, folderId);
        res.status(201).json({
            success: true,
            data: sessionInfo
        });
    }
    catch (error) {
        next(error);
    }
});
exports.initiateChunkUpload = initiateChunkUpload;
const getChunkUploadStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uploadId } = req.query;
        const userId = req.user.id;
        if (!uploadId) {
            return next(new AppError_1.AppError('uploadId query parameter is required', 400));
        }
        const status = yield chunkUploadService.getUploadStatus(userId, String(uploadId));
        res.status(200).json({
            success: true,
            data: status
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getChunkUploadStatus = getChunkUploadStatus;
const uploadChunk = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uploadId = req.headers['x-upload-id'];
        const chunkIndexStr = req.headers['x-chunk-index'];
        const checksum = req.headers['x-chunk-checksum'];
        const sizeStr = req.headers['x-chunk-size'];
        const userId = req.user.id;
        if (!uploadId || chunkIndexStr === undefined || !checksum || !sizeStr) {
            return next(new AppError_1.AppError('x-upload-id, x-chunk-index, x-chunk-checksum, and x-chunk-size headers are required', 400));
        }
        const chunkIndex = parseInt(String(chunkIndexStr), 10);
        const size = parseInt(String(sizeStr), 10);
        yield chunkUploadService.saveChunk(userId, String(uploadId), chunkIndex, String(checksum), size, req);
        res.status(200).json({
            success: true,
            message: 'Chunk uploaded successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.uploadChunk = uploadChunk;
const completeChunkUpload = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uploadId } = req.body;
        const userId = req.user.id;
        if (!uploadId) {
            return next(new AppError_1.AppError('uploadId is required', 400));
        }
        const fileRecord = yield chunkUploadService.completeUpload(userId, String(uploadId));
        const responseFile = Object.assign(Object.assign({}, fileRecord), { size: fileRecord.size.toString() });
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            data: responseFile
        });
    }
    catch (error) {
        next(error);
    }
});
exports.completeChunkUpload = completeChunkUpload;
const cancelChunkUpload = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uploadId } = req.body;
        const userId = req.user.id;
        if (!uploadId) {
            return next(new AppError_1.AppError('uploadId is required', 400));
        }
        yield chunkUploadService.cancelUpload(userId, String(uploadId));
        res.status(200).json({
            success: true,
            message: 'Upload cancelled successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.cancelChunkUpload = cancelChunkUpload;
const getFiles = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { folderId } = req.query;
        if (folderId) {
            const hasAccess = yield (0, permissions_1.hasFolderAccess)(String(folderId), userId);
            if (!hasAccess)
                return next(new AppError_1.AppError('Unauthorized', 403));
        }
        const files = yield db_1.default.file.findMany({
            where: Object.assign({ folderId: folderId ? String(folderId) : null }, (folderId ? {} : { ownerId: userId }))
        });
        const serializedFiles = files.map(file => (Object.assign(Object.assign({}, file), { size: file.size.toString() })));
        res.status(200).json({
            success: true,
            data: serializedFiles
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getFiles = getFiles;
const downloadFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Check if user owns the file or if it's shared with them
        const file = yield db_1.default.file.findUnique({
            where: { id },
            include: { userShares: { where: { sharedWithId: userId } } }
        });
        if (!file) {
            return next(new AppError_1.AppError('File not found', 404));
        }
        if (file.ownerId !== userId && file.userShares.length === 0) {
            return next(new AppError_1.AppError('Unauthorized to download this file', 403));
        }
        const rangeHeader = req.headers.range;
        let stream;
        const totalSize = Number(file.size);
        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
            if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
                res.setHeader('Content-Range', `bytes */${totalSize}`);
                res.status(416).end();
                return;
            }
            const chunksize = (end - start) + 1;
            const downloadResult = yield fileService.getDownloadStream(id, file.ownerId, { start, end });
            stream = downloadResult.stream;
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': file.mimeType,
                'Content-Disposition': `attachment; filename="${file.originalName}"`
            });
        }
        else {
            const downloadResult = yield fileService.getDownloadStream(id, file.ownerId);
            stream = downloadResult.stream;
            res.writeHead(200, {
                'Content-Length': totalSize,
                'Content-Type': file.mimeType,
                'Content-Disposition': `attachment; filename="${file.originalName}"`,
                'Accept-Ranges': 'bytes'
            });
        }
        stream.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
exports.downloadFile = downloadFile;
const deleteFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        yield fileService.deleteFile(id, userId);
        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteFile = deleteFile;
const toggleStarFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const file = yield db_1.default.file.findUnique({
            where: { id }
        });
        if (!file) {
            return next(new AppError_1.AppError('File not found', 404));
        }
        if (file.ownerId !== userId) {
            return next(new AppError_1.AppError('Unauthorized', 403));
        }
        const updatedFile = yield db_1.default.file.update({
            where: { id },
            data: { starred: !file.starred }
        });
        res.status(200).json({
            success: true,
            message: updatedFile.starred ? 'File starred' : 'File unstarred',
            data: Object.assign(Object.assign({}, updatedFile), { size: updatedFile.size.toString() })
        });
    }
    catch (error) {
        next(error);
    }
});
exports.toggleStarFile = toggleStarFile;
