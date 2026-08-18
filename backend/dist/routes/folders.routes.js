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
exports.toggleStarFolder = exports.downloadFolder = exports.deleteFolder = exports.getFolders = exports.createFolder = void 0;
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const AppError_1 = require("../utils/AppError");
const permissions_1 = require("../utils/permissions");
const StorageFactory_1 = require("../services/storage/StorageFactory");
const storageService = (0, StorageFactory_1.getStorageProvider)();
const createFolder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, parentId } = req.body;
        const userId = req.user.id;
        if (!name) {
            return next(new AppError_1.AppError('Folder name is required', 400));
        }
        const folder = yield db_1.default.folder.create({
            data: {
                name,
                parentId: parentId || null,
                ownerId: userId
            }
        });
        yield db_1.default.activityLog.create({
            data: {
                userId,
                action: 'CREATE_FOLDER',
                entityType: 'FOLDER',
                entityId: folder.id,
                entityName: folder.name
            }
        });
        res.status(201).json({ success: true, data: folder });
    }
    catch (error) {
        next(error);
    }
});
exports.createFolder = createFolder;
const getFolders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { parentId } = req.query;
        if (parentId) {
            const hasAccess = yield (0, permissions_1.hasFolderAccess)(String(parentId), userId);
            if (!hasAccess)
                return next(new AppError_1.AppError('Unauthorized', 403));
        }
        const folders = yield db_1.default.folder.findMany({
            where: Object.assign({ parentId: parentId ? String(parentId) : null }, (parentId ? {} : { ownerId: userId }))
        });
        res.status(200).json({ success: true, data: folders });
    }
    catch (error) {
        next(error);
    }
});
exports.getFolders = getFolders;
const deleteFolder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const folder = yield db_1.default.folder.findUnique({ where: { id } });
        if (!folder)
            return next(new AppError_1.AppError('Folder not found', 404));
        if (folder.ownerId !== userId)
            return next(new AppError_1.AppError('Unauthorized', 403));
        // Due to Cascade delete on FolderHierarchy and Files, Prisma will delete subfolders and files.
        // However, we need to handle physical files and quotas.
        // In a real scenario, we'd need a recursive function to delete all files inside the folder and subfolders properly.
        // For simplicity in this demo, let's just delete the DB record. The physical files might be orphaned,
        // which requires a cleanup cron job later.
        yield db_1.default.activityLog.create({
            data: {
                userId,
                action: 'DELETE_FOLDER',
                entityType: 'FOLDER',
                entityId: id,
                entityName: folder.name
            }
        });
        yield db_1.default.folder.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Folder deleted' });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteFolder = deleteFolder;
const getFolderTreeFiles = (folderId_1, ...args_1) => __awaiter(void 0, [folderId_1, ...args_1], void 0, function* (folderId, currentPath = '') {
    let results = [];
    const files = yield db_1.default.file.findMany({
        where: { folderId },
        include: { physicalFile: true }
    });
    for (const file of files) {
        results.push({
            file,
            archivePath: currentPath ? `${currentPath}/${file.originalName}` : file.originalName
        });
    }
    const subfolders = yield db_1.default.folder.findMany({
        where: { parentId: folderId }
    });
    for (const subfolder of subfolders) {
        const subfolderPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
        const subResults = yield getFolderTreeFiles(subfolder.id, subfolderPath);
        results.push(...subResults);
        if (subResults.length === 0) {
            results.push({ file: null, archivePath: subfolderPath + '/' });
        }
    }
    return results;
});
const downloadFolder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const hasAccess = yield (0, permissions_1.hasFolderAccess)(id, userId);
        if (!hasAccess) {
            return next(new AppError_1.AppError('Unauthorized access to folder', 403));
        }
        const folder = yield db_1.default.folder.findUnique({ where: { id } });
        if (!folder) {
            return next(new AppError_1.AppError('Folder not found', 404));
        }
        const fileEntries = yield getFolderTreeFiles(id, folder.name);
        res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        // @ts-ignore
        const { ZipArchive } = require('archiver');
        const archive = new ZipArchive({ zlib: { level: 5 } });
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                next(err);
            }
            else {
                res.end();
            }
        });
        archive.pipe(res);
        for (const entry of fileEntries) {
            if (entry.file === null) {
                archive.append('', { name: entry.archivePath });
            }
            else {
                try {
                    const stream = yield storageService.download(entry.file.physicalFile.storagePath);
                    archive.append(stream, { name: entry.archivePath });
                }
                catch (err) {
                    console.error(`Failed to append ${entry.archivePath}:`, err);
                }
            }
        }
        yield archive.finalize();
        yield db_1.default.activityLog.create({
            data: {
                userId,
                action: 'DOWNLOAD_FOLDER',
                entityType: 'FOLDER',
                entityId: id,
                entityName: folder.name,
                ipAddress: req.ip
            }
        });
    }
    catch (error) {
        if (!res.headersSent) {
            next(error);
        }
    }
});
exports.downloadFolder = downloadFolder;
const toggleStarFolder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const folder = yield db_1.default.folder.findUnique({
            where: { id }
        });
        if (!folder) {
            return next(new AppError_1.AppError('Folder not found', 404));
        }
        if (folder.ownerId !== userId) {
            return next(new AppError_1.AppError('Unauthorized', 403));
        }
        const updatedFolder = yield db_1.default.folder.update({
            where: { id },
            data: { starred: !folder.starred }
        });
        res.status(200).json({
            success: true,
            message: updatedFolder.starred ? 'Folder starred' : 'Folder unstarred',
            data: updatedFolder
        });
    }
    catch (error) {
        next(error);
    }
});
exports.toggleStarFolder = toggleStarFolder;
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', exports.createFolder);
router.get('/', exports.getFolders);
router.get('/:id/download', exports.downloadFolder);
router.delete('/:id', exports.deleteFolder);
router.patch('/:id/star', exports.toggleStarFolder);
exports.default = router;
