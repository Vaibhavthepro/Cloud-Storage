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
exports.LocalStorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = require("stream/promises");
class LocalStorageService {
    constructor(baseDir = path_1.default.join(__dirname, '../../../storage')) {
        this.baseDir = baseDir;
        if (!fs_1.default.existsSync(this.baseDir)) {
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    getFullPath(filePath) {
        return path_1.default.join(this.baseDir, filePath);
    }
    upload(filePath, fileStream) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullPath = this.getFullPath(filePath);
            const dir = path_1.default.dirname(fullPath);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            if (Buffer.isBuffer(fileStream)) {
                yield fs_1.default.promises.writeFile(fullPath, fileStream);
            }
            else {
                const writeStream = fs_1.default.createWriteStream(fullPath);
                yield (0, promises_1.pipeline)(fileStream, writeStream);
            }
            return fullPath;
        });
    }
    download(filePath, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullPath = this.getFullPath(filePath);
            if (!fs_1.default.existsSync(fullPath)) {
                throw new Error('File not found');
            }
            return fs_1.default.createReadStream(fullPath, options);
        });
    }
    delete(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullPath = this.getFullPath(filePath);
            if (fs_1.default.existsSync(fullPath)) {
                yield fs_1.default.promises.unlink(fullPath);
                return true;
            }
            return false;
        });
    }
    move(sourcePath, destinationPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullSourcePath = this.getFullPath(sourcePath);
            const fullDestPath = this.getFullPath(destinationPath);
            if (fs_1.default.existsSync(fullSourcePath)) {
                const destDir = path_1.default.dirname(fullDestPath);
                if (!fs_1.default.existsSync(destDir)) {
                    fs_1.default.mkdirSync(destDir, { recursive: true });
                }
                yield fs_1.default.promises.rename(fullSourcePath, fullDestPath);
                return true;
            }
            return false;
        });
    }
    copy(sourcePath, destinationPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullSourcePath = this.getFullPath(sourcePath);
            const fullDestPath = this.getFullPath(destinationPath);
            if (fs_1.default.existsSync(fullSourcePath)) {
                const destDir = path_1.default.dirname(fullDestPath);
                if (!fs_1.default.existsSync(destDir)) {
                    fs_1.default.mkdirSync(destDir, { recursive: true });
                }
                yield fs_1.default.promises.copyFile(fullSourcePath, fullDestPath);
                return true;
            }
            return false;
        });
    }
    exists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullPath = this.getFullPath(filePath);
            try {
                yield fs_1.default.promises.access(fullPath);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    getMetadata(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullPath = this.getFullPath(filePath);
            const stats = yield fs_1.default.promises.stat(fullPath);
            // Calculate SHA-256 hash
            const hash = crypto_1.default.createHash('sha256');
            const readStream = fs_1.default.createReadStream(fullPath);
            return new Promise((resolve, reject) => {
                readStream.on('data', (chunk) => hash.update(chunk));
                readStream.on('end', () => {
                    resolve({
                        size: stats.size,
                        hash: hash.digest('hex'),
                    });
                });
                readStream.on('error', reject);
            });
        });
    }
}
exports.LocalStorageService = LocalStorageService;
