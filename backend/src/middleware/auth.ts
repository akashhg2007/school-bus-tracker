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

  throw new Error(
    'JWT_SECRET environment variable must be set to a secure value (min 32 chars). ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"'
  );
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

// Cookie configuration
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'sb_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
};

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token: string | null = null;

    // 1. Check Authorization header first (for API/mobile clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fall back to httpOnly cookie (for web dashboard)
    if (!token && req.cookies?.[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

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
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp - now > 3600) {
    throw new UnauthorizedError('Token can only be refreshed within 1 hour of expiry');
  }
  revokeToken(token);
  const { exp, iat, ...payload } = decoded;
  const newToken = generateToken(payload);
  return newToken;
};
