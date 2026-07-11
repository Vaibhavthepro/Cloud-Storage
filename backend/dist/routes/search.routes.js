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
        const { q } = req.query;
        const userId = req.user.id;
        if (!q) {
            return res.status(200).json({ success: true, data: [] });
        }
        const searchQuery = String(q);
        const files = yield db_1.default.file.findMany({
            where: {
                ownerId: userId,
                originalName: {
                    contains: searchQuery,
                    mode: 'insensitive' // Requires Prisma Client 2.15+ on Postgres
                }
            }
        });
        const folders = yield db_1.default.folder.findMany({
            where: {
                ownerId: userId,
                name: {
                    contains: searchQuery,
                    mode: 'insensitive'
                }
            }
        });
        const serializedFiles = files.map(file => (Object.assign(Object.assign({}, file), { size: file.size.toString() })));
        res.status(200).json({
            success: true,
            data: {
                files: serializedFiles,
                folders
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = router;
