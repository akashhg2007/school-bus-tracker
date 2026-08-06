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
    const { phone } = req.body;
    const result = await authService.verifyOtp(phone);
    sendSuccess(res, 'OTP verified successfully', result);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Token refresh logic - generate new token with same payload
    const user = req.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { generateToken } = await import('../../middleware/auth');
    const newToken = generateToken(user);

    sendSuccess(res, 'Token refreshed successfully', { token: newToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In a real app, you might want to invalidate the token
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
