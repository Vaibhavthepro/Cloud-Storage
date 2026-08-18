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
        this.isInitialized = false;
        this.initializationAttempted = false;
        this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initializationAttempted)
                return;
            this.initializationAttempted = true;
            if (process.env.CLAMAV_ENABLED === 'false') {
                console.log('[VirusScanner] ClamAV scanning explicitly disabled via CLAMAV_ENABLED=false');
                return;
            }
            const host = process.env.CLAMAV_HOST || 'localhost';
            const port = parseInt(process.env.CLAMAV_PORT || '3310', 10);
            try {
                this.scanner = yield new clamscan_1.default().init({
                    clamdscan: {
                        host,
                        port,
                        timeout: 5000,
                        localFallback: false,
                        path: '/usr/bin/clamdscan',
                        multiscan: true,
                        reloadDb: false,
                        active: true,
                        bypassTest: false,
                    },
                    preference: 'clamdscan',
                });
                this.isInitialized = true;
                console.log(`[VirusScanner] ClamAV Scanner initialized successfully at ${host}:${port}`);
            }
            catch (err) {
                this.isInitialized = false;
                this.scanner = null;
                console.warn(`[VirusScanner] ClamAV daemon is not reachable at ${host}:${port} (${err.code || err.message}). Skipping virus scan.`);
            }
        });
    }
    scanFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initializationAttempted) {
                yield this.init();
            }
            if (!this.scanner || !this.isInitialized) {
                return { isInfected: false, viruses: [] };
            }
            try {
                const { isInfected, viruses } = yield this.scanner.isInfected(filePath);
                return { isInfected, viruses };
            }
            catch (err) {
                console.error('[VirusScanner] Error scanning file:', err.message || err);
                return { isInfected: false, viruses: [] };
            }
        });
    }
}
exports.VirusScannerService = VirusScannerService;
