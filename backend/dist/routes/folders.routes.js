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
exports.deleteFolder = exports.getFolders = exports.createFolder = void 0;
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const AppError_1 = require("../utils/AppError");
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
                entityId: folder.id
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
        const folders = yield db_1.default.folder.findMany({
            where: {
                ownerId: userId,
                parentId: parentId ? String(parentId) : null
            }
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
        yield db_1.default.folder.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Folder deleted' });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteFolder = deleteFolder;
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', exports.createFolder);
router.get('/', exports.getFolders);
router.delete('/:id', exports.deleteFolder);
exports.default = router;
