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
exports.deleteFile = exports.downloadFile = exports.getFiles = exports.uploadFile = void 0;
const FileService_1 = require("../services/FileService");
const AppError_1 = require("../utils/AppError");
const db_1 = __importDefault(require("../config/db"));
const fileService = new FileService_1.FileService();
const uploadFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return next(new AppError_1.AppError('No file uploaded', 400));
        }
        const { folderId } = req.body;
        const userId = req.user.id;
        // Check storage quota
        const user = yield db_1.default.user.findUnique({ where: { id: userId } });
        if (user && user.storageUsed + BigInt(req.file.size) > user.storageQuota) {
            return next(new AppError_1.AppError('Storage quota exceeded', 400));
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
const getFiles = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { folderId } = req.query;
        const files = yield db_1.default.file.findMany({
            where: {
                ownerId: userId,
                folderId: folderId ? String(folderId) : null
            }
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
        const { stream, filename, mimeType } = yield fileService.getDownloadStream(id, userId);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', mimeType);
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
