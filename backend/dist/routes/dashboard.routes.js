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
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const user = yield db_1.default.user.findUnique({
            where: { id: userId },
            select: { storageUsed: true, storageQuota: true }
        });
        const fileCount = yield db_1.default.file.count({ where: { ownerId: userId } });
        const folderCount = yield db_1.default.folder.count({ where: { ownerId: userId } });
        const totalUsers = yield db_1.default.user.count();
        const recentActivity = yield db_1.default.activityLog.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 10
        });
        res.status(200).json({
            success: true,
            data: {
                storageUsed: user === null || user === void 0 ? void 0 : user.storageUsed.toString(),
                storageQuota: user === null || user === void 0 ? void 0 : user.storageQuota.toString(),
                fileCount,
                folderCount,
                totalUsers,
                recentActivity
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = router;
