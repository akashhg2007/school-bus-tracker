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

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const fallback = 'dev-only-change-me';
  if (isProduction) {
    throw new Error('JWT_SECRET environment variable must be set to a secure value in production');
  }
  console.warn('WARNING: Using insecure default JWT secret. Set JWT_SECRET in production.');
  return fallback;
};

// In-memory revoked token set for stateless JWTs (lost on restart).
// Since tokens expire within JWT_EXPIRY (default 7d), entries self-eliminate by expiry.
const revokedTokens = new Set<string>();

export const revokeToken = (token: string): void => {
  revokedTokens.add(token);
};

export const isTokenRevoked = (token: string): boolean => revokedTokens.has(token);

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;

    if (isTokenRevoked(token)) {
      throw new UnauthorizedError('Token revoked');
    }

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
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiry,
  });
};

export const verifyToken = (token: string): AuthPayload => {
  const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
  if (isTokenRevoked(token)) {
    throw new UnauthorizedError('Token revoked');
  }
  return decoded;
};

export const refreshToken = (token: string): string => {
  const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload & { exp?: number; iat?: number };
  const { exp, iat, ...payload } = decoded;
  const newToken = generateToken(payload);
  return newToken;
};
