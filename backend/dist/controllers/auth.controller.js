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
exports.googleLogin = exports.getProfile = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
const google_auth_library_1 = require("google-auth-library");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const generateToken = (id, role) => {
    return jsonwebtoken_1.default.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });
};
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return next(new AppError_1.AppError('Please provide all fields', 400));
        }
        const existingUser = yield db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new AppError_1.AppError('Email already in use', 400));
        }
        const salt = yield bcrypt_1.default.genSalt(10);
        const passwordHash = yield bcrypt_1.default.hash(password, salt);
        // Make the first user an ADMIN, others USER
        const count = yield db_1.default.user.count();
        const role = count === 0 ? 'ADMIN' : 'USER';
        const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);
        const user = yield db_1.default.user.create({
            data: {
                name,
                email,
                passwordHash,
                role,
                storageQuota: defaultQuota
            },
        });
        yield db_1.default.activityLog.create({
            data: {
                userId: user.id,
                action: 'REGISTER',
                entityType: 'USER',
                entityId: user.id,
                entityName: user.name,
                ipAddress: req.ip
            }
        });
        res.status(201).json({
            success: true,
            token: generateToken(user.id, user.role),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.register = register;
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new AppError_1.AppError('Please provide email and password', 400));
        }
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return next(new AppError_1.AppError('Invalid credentials', 401));
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return next(new AppError_1.AppError('Invalid credentials', 401));
        }
        yield db_1.default.activityLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN',
                entityType: 'USER',
                entityId: user.id,
                entityName: user.name,
                ipAddress: req.ip
            }
        });
        res.status(200).json({
            success: true,
            token: generateToken(user.id, user.role),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.login = login;
const getProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);
        let user = yield db_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                storageQuota: true,
                storageUsed: true,
                createdAt: true
            }
        });
        if (!user) {
            return next(new AppError_1.AppError('User not found', 404));
        }
        if (user.storageQuota < defaultQuota) {
            user = yield db_1.default.user.update({
                where: { id: req.user.id },
                data: { storageQuota: defaultQuota },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    storageQuota: true,
                    storageUsed: true,
                    createdAt: true
                }
            });
        }
        // Convert BigInt to string to avoid JSON serialization error
        const userResponse = Object.assign(Object.assign({}, user), { storageQuota: user.storageQuota.toString(), storageUsed: user.storageUsed.toString() });
        res.status(200).json({
            success: true,
            data: userResponse
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getProfile = getProfile;
const googleLogin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { credential } = req.body;
        if (!credential) {
            return next(new AppError_1.AppError('Google credential is required', 400));
        }
        const ticket = yield client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return next(new AppError_1.AppError('Invalid Google token', 401));
        }
        const { email, name, sub } = payload;
        let user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            const count = yield db_1.default.user.count();
            const role = count === 0 ? 'ADMIN' : 'USER';
            const salt = yield bcrypt_1.default.genSalt(10);
            const randomPassword = yield bcrypt_1.default.hash(sub + Date.now().toString(), salt);
            const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);
            user = yield db_1.default.user.create({
                data: {
                    name: name || 'Google User',
                    email,
                    passwordHash: randomPassword,
                    role,
                    storageQuota: defaultQuota
                },
            });
            yield db_1.default.activityLog.create({
                data: {
                    userId: user.id,
                    action: 'REGISTER_GOOGLE',
                    entityType: 'USER',
                    entityId: user.id,
                    entityName: user.name,
                    ipAddress: req.ip
                }
            });
        }
        else {
            yield db_1.default.activityLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN_GOOGLE',
                    entityType: 'USER',
                    entityId: user.id,
                    entityName: user.name,
                    ipAddress: req.ip
                }
            });
        }
        res.status(200).json({
            success: true,
            token: generateToken(user.id, user.role),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.googleLogin = googleLogin;
