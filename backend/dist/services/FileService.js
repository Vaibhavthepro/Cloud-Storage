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
exports.FileService = void 0;
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("../config/db"));
const LocalStorageService_1 = require("./storage/LocalStorageService");
const VirusScannerService_1 = require("./VirusScannerService");
const AppError_1 = require("../utils/AppError");
class FileService {
    constructor() {
        this.storageService = new LocalStorageService_1.LocalStorageService();
        this.virusScanner = new VirusScannerService_1.VirusScannerService();
    }
    calculateHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto_1.default.createHash('sha256');
            const stream = fs_1.default.createReadStream(filePath);
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    handleUpload(userId, file, folderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const tempPath = file.path;
            try {
                // 1. Virus Scanning
                const { isInfected, viruses } = yield this.virusScanner.scanFile(tempPath);
                if (isInfected) {
                    // Log virus detection
                    // For a real system, you might want to create a dummy file record to link the log to,
                    // or log it against the user directly.
                    yield db_1.default.activityLog.create({
                        data: {
                            userId,
                            action: 'VIRUS_DETECTED',
                            entityType: 'FILE',
                            ipAddress: 'System', // Could pass from req
                        }
                    });
                    fs_1.default.unlinkSync(tempPath); // Delete infected file
                    throw new AppError_1.AppError(`File is infected with virus: ${viruses.join(', ')}`, 400);
                }
                // 2. Duplicate Detection (Calculate Hash)
                const fileHash = yield this.calculateHash(tempPath);
                const size = BigInt(file.size);
                // Check if physical file exists
                let physicalStorage = yield db_1.default.physicalStorage.findUnique({
                    where: { hash: fileHash }
                });
                if (physicalStorage) {
                    // Increment reference count and delete temp file since we don't need it
                    physicalStorage = yield db_1.default.physicalStorage.update({
                        where: { id: physicalStorage.id },
                        data: { referenceCount: { increment: 1 } }
                    });
                    fs_1.default.unlinkSync(tempPath);
                }
                else {
                    // Move temp file to permanent storage
                    const permanentPath = path_1.default.join('uploads', `${fileHash}-${file.originalname}`);
                    yield this.storageService.move(tempPath, permanentPath);
                    // Create new physical storage record
                    physicalStorage = yield db_1.default.physicalStorage.create({
                        data: {
                            hash: fileHash,
                            storagePath: permanentPath,
                            size: size
                        }
                    });
                }
                // 3. Create virtual File record linked to physical storage
                const extension = path_1.default.extname(file.originalname).substring(1);
                const newFile = yield db_1.default.file.create({
                    data: {
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        extension,
                        size: size,
                        isInfected: false,
                        ownerId: userId,
                        physicalId: physicalStorage.id,
                        folderId: folderId || null
                    }
                });
                // Update user storage used
                if (!physicalStorage.referenceCount || physicalStorage.referenceCount === 1) {
                    // Only bill user quota if they uploaded a unique file? 
                    // Actually, cloud providers usually bill for the virtual size. 
                    // Let's bill them for the virtual size.
                    yield db_1.default.user.update({
                        where: { id: userId },
                        data: { storageUsed: { increment: size } }
                    });
                }
                yield db_1.default.activityLog.create({
                    data: {
                        userId,
                        action: 'UPLOAD_FILE',
                        entityType: 'FILE',
                        entityId: newFile.id
                    }
                });
                return newFile;
            }
            catch (error) {
                if (fs_1.default.existsSync(tempPath)) {
                    fs_1.default.unlinkSync(tempPath);
                }
                throw error;
            }
        });
    }
    getDownloadStream(fileId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = yield db_1.default.file.findUnique({
                where: { id: fileId },
                include: { physicalFile: true }
            });
            if (!file) {
                throw new AppError_1.AppError('File not found', 404);
            }
            // Check ownership or if shared
            // Simplified for now, just check ownership
            if (file.ownerId !== userId) {
                throw new AppError_1.AppError('Unauthorized access to file', 403);
            }
            const stream = yield this.storageService.download(file.physicalFile.storagePath);
            return { stream, filename: file.originalName, mimeType: file.mimeType };
        });
    }
    deleteFile(fileId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = yield db_1.default.file.findUnique({
                where: { id: fileId },
                include: { physicalFile: true }
            });
            if (!file) {
                throw new AppError_1.AppError('File not found', 404);
            }
            if (file.ownerId !== userId) {
                throw new AppError_1.AppError('Unauthorized access to file', 403);
            }
            yield db_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Delete virtual file
                yield tx.file.delete({ where: { id: fileId } });
                // Update user quota
                yield tx.user.update({
                    where: { id: userId },
                    data: { storageUsed: { decrement: file.size } }
                });
                // Decrement physical reference count
                const updatedPhysical = yield tx.physicalStorage.update({
                    where: { id: file.physicalId },
                    data: { referenceCount: { decrement: 1 } }
                });
                // If reference count is 0, delete physical file
                if (updatedPhysical.referenceCount <= 0) {
                    yield tx.physicalStorage.delete({ where: { id: file.physicalId } });
                    yield this.storageService.delete(file.physicalFile.storagePath);
                }
                yield tx.activityLog.create({
                    data: {
                        userId,
                        action: 'DELETE_FILE',
                        entityType: 'FILE',
                        entityId: fileId
                    }
                });
            }));
            return true;
        });
    }
}
exports.FileService = FileService;
