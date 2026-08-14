import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Trust proxy for Nginx reverse proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Adjust for production
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for chunk uploads and admin endpoints
    return req.originalUrl.includes('/files/upload/chunk') || req.originalUrl.includes('/api/admin');
  }
});
app.use('/api', limiter);

import authRoutes from './routes/auth.routes';
import fileRoutes from './routes/files.routes';
import folderRoutes from './routes/folders.routes';
import searchRoutes from './routes/search.routes';
import dashboardRoutes from './routes/dashboard.routes';
import sharesRoutes from './routes/shares.routes';
import adminRoutes from './routes/admin.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shares', sharesRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Cloud Storage API is running' });
});

// Error handling
app.use(errorHandler);

export default app;
