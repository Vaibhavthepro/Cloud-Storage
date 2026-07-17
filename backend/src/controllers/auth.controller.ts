import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '1d',
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(new AppError('Please provide all fields', 400));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Make the first user an ADMIN, others USER
    const count = await prisma.user.count();
    const role = count === 0 ? 'ADMIN' : 'USER';

    const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        storageQuota: defaultQuota
      },
    });

    await prisma.activityLog.create({
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
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    await prisma.activityLog.create({
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
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);

    let user = await prisma.user.findUnique({
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
      return next(new AppError('User not found', 404));
    }

    if (user.storageQuota < defaultQuota) {
      user = await prisma.user.update({
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
    const userResponse = {
      ...user,
      storageQuota: user.storageQuota.toString(),
      storageUsed: user.storageUsed.toString()
    };

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return next(new AppError('Google credential is required', 400));
    }
    
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return next(new AppError('Invalid Google token', 401));
    }
    
    const { email, name, sub } = payload;
    
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      const count = await prisma.user.count();
      const role = count === 0 ? 'ADMIN' : 'USER';
      
      const salt = await bcrypt.genSalt(10);
      const randomPassword = await bcrypt.hash(sub + Date.now().toString(), salt);
      
      const defaultQuota = process.env.DEFAULT_STORAGE_QUOTA ? BigInt(process.env.DEFAULT_STORAGE_QUOTA) : BigInt(1073741824);

      user = await prisma.user.create({
        data: {
          name: name || 'Google User',
          email,
          passwordHash: randomPassword,
          role,
          storageQuota: defaultQuota
        },
      });
      
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER_GOOGLE',
          entityType: 'USER',
          entityId: user.id,
          entityName: user.name,
          ipAddress: req.ip
        }
      });
    } else {
      await prisma.activityLog.create({
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
    
  } catch (error) {
    next(error);
  }
};
