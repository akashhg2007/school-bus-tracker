import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const AUDITED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

const SENSITIVE_PATHS = [
  '/auth/login',
  '/auth/setup-password',
  '/auth/create-admin',
  '/auth/register-parent',
  '/auth/register-driver',
  '/parents/',
  '/drivers/',
  '/buses/',
  '/trips/',
  '/attendance/',
  '/students/',
];

const isSensitiveRequest = (req: Request): boolean => {
  if (!AUDITED_METHODS.includes(req.method)) return false;
  return SENSITIVE_PATHS.some((p) => req.path.includes(p));
};

export const auditLog = (req: Request, _res: Response, next: NextFunction): void => {
  if (isSensitiveRequest(req)) {
    const userId = (req as any).user?.userId || 'anonymous';
    const userType = (req as any).user?.userType || 'unknown';
    logger.info('audit', {
      method: req.method,
      path: req.path,
      userId,
      userType,
      ip: req.ip || req.socket.remoteAddress,
    });
  }
  next();
};
