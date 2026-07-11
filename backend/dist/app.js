"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
// Security Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: '*', // Adjust for production
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const files_routes_1 = __importDefault(require("./routes/files.routes"));
const folders_routes_1 = __importDefault(require("./routes/folders.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/files', files_routes_1.default);
app.use('/api/folders', folders_routes_1.default);
app.use('/api/search', search_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Cloud Storage API is running' });
});
// Error handling
app.use(error_middleware_1.errorHandler);
exports.default = app;
