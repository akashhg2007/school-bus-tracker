import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

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

let cachedJwtSecret: string | null = null;

const getJwtSecret = (): string => {
  if (cachedJwtSecret) return cachedJwtSecret;

  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    cachedJwtSecret = secret;
    return secret;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    throw new Error('JWT_SECRET environment variable must be set to a secure value (min 32 chars) in production');
  }
  console.warn('WARNING: Using insecure default JWT secret. Set JWT_SECRET in production.');
  cachedJwtSecret = 'dev-only-change-this-to-at-least-32-chars!';
  return cachedJwtSecret;
};

const revokedTokens = new Map<string, number>();
const TOKEN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_TOKEN_REVOCATION_AGE_MS = 7 * 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of revokedTokens) {
    if (now - timestamp > MAX_TOKEN_REVOCATION_AGE_MS) {
      revokedTokens.delete(token);
    }
  }
}, TOKEN_CLEANUP_INTERVAL_MS).unref();

export const revokeToken = (token: string): void => {
  revokedTokens.set(token, Date.now());
};

export const isTokenRevoked = (token: string): boolean => revokedTokens.has(token);

const JWT_ALGORITHM = 'HS256' as const;

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] }) as AuthPayload;

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
      return next(new ForbiddenError('Not authorized'));
    }

    next();
  };
};

export const generateToken = (payload: AuthPayload): string => {
  const expiry = (process.env.JWT_EXPIRY || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiry,
    algorithm: JWT_ALGORITHM,
  });
};

export const verifyToken = (token: string): AuthPayload => {
  const decoded = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] }) as AuthPayload;
  if (isTokenRevoked(token)) {
    throw new UnauthorizedError('Token revoked');
  }
  return decoded;
};

export const refreshToken = (token: string): string => {
  const decoded = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] }) as AuthPayload & { exp?: number; iat?: number };
  revokeToken(token);
  const { exp, iat, ...payload } = decoded;
  const newToken = generateToken(payload);
  return newToken;
};
