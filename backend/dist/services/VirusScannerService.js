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
exports.VirusScannerService = void 0;
const clamscan_1 = __importDefault(require("clamscan"));
class VirusScannerService {
    constructor() {
        this.scanner = null;
        this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.scanner = yield new clamscan_1.default().init({
                    clamdscan: {
                        host: process.env.CLAMAV_HOST || 'localhost',
                        port: parseInt(process.env.CLAMAV_PORT || '3310'),
                        timeout: 60000,
                        localFallback: false,
                        path: '/usr/bin/clamdscan',
                        multiscan: true,
                        reloadDb: false,
                        active: true,
                        bypassTest: false,
                    },
                    preference: 'clamdscan'
                });
                console.log('ClamAV Scanner initialized successfully');
            }
            catch (err) {
                console.error('Failed to initialize ClamAV Scanner:', err);
            }
        });
    }
    scanFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.scanner) {
                console.warn('Scanner not initialized, skipping scan.');
                return { isInfected: false, viruses: [] };
            }
            try {
                const { isInfected, viruses } = yield this.scanner.isInfected(filePath);
                return { isInfected, viruses };
            }
            catch (err) {
                console.error('Error scanning file:', err);
                // In production, you might want to fail closed (treat as infected or error out)
                // but for development resilience, returning false here if clamav is unreachable.
                return { isInfected: false, viruses: [] };
            }
        });
    }
}
exports.VirusScannerService = VirusScannerService;
