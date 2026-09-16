import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(`[AppError ${err.statusCode}]: ${err.message}`, err);
    } else {
      console.warn(`[Auth/Client Error ${err.statusCode}]: ${err.message} - ${req.method} ${req.originalUrl}`);
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error('[Unhandled Server Error]:', err);

  // Handle Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
    });
  }

  const errorMessage = err.message || 'Internal server error';

  return res.status(500).json({
    success: false,
    message: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
