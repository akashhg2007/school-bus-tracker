import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const isParent = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'PARENT') {
    return next(new ForbiddenError('Parent access only'));
  }
  next();
};

export const isDriver = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'DRIVER') {
    return next(new ForbiddenError('Driver access only'));
  }
  next();
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'ADMIN') {
    return next(new ForbiddenError('Admin access only'));
  }
  next();
};

export const isDriverOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'DRIVER' && req.user?.userType !== 'ADMIN') {
    return next(new ForbiddenError('Driver or Admin access only'));
  }
  next();
};
