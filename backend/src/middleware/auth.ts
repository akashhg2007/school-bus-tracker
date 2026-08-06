import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';

export interface AuthPayload {
  userId: string;
  userType: 'PARENT' | 'DRIVER' | 'ADMIN';
  schoolId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as AuthPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.userType)) {
      return next(new UnauthorizedError('Not authorized'));
    }

    next();
  };
};

export const generateToken = (payload: AuthPayload): string => {
  const expiry = (process.env.JWT_EXPIRY || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', {
    expiresIn: expiry,
  });
};

export const verifyToken = (token: string): AuthPayload => {
  return jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as AuthPayload;
};
