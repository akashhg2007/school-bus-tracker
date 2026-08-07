import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.body;
    const result = await authService.sendOtp(phone);
    sendSuccess(res, 'OTP sent successfully', result);
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    const result = await authService.verifyOtp(phone, otp);
    sendSuccess(res, 'OTP verified successfully', result);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const { refreshToken: refreshFn } = await import('../../middleware/auth');
    const newToken = refreshFn(token);

    sendSuccess(res, 'Token refreshed successfully', { token: newToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { revokeToken } = await import('../../middleware/auth');
      revokeToken(authHeader.split(' ')[1]);
    }
    sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const updateFcmToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fcmToken } = req.body;
    const user = req.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    await authService.updateFcmToken(user.userId, user.userType, fcmToken);
    sendSuccess(res, 'FCM token updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error('User not authenticated');
    }
    const profile = await authService.getMe(user.userId, user.userType);
    sendSuccess(res, 'User profile retrieved', profile);
  } catch (error) {
    next(error);
  }
};
