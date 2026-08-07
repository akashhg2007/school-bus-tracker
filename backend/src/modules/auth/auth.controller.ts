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

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password } = req.body;
    const result = await authService.loginWithPassword(identifier, password);
    sendSuccess(res, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userType, name, phone, email, password, schoolId, licenseNumber } = req.body;
    const result = await authService.registerUser(userType, {
      name, phone, email, password, schoolId, licenseNumber,
    });
    sendSuccess(res, 'User registered successfully', result);
  } catch (error) {
    next(error);
  }
};

export const activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    const result = await authService.activateAccount(token, password);
    sendSuccess(res, result.message, { userType: result.userType });
  } catch (error) {
    next(error);
  }
};

export const generateActivation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const url = await authService.generateActivationToken(user.userId, user.userType);
    sendSuccess(res, 'Activation link generated', { activationUrl: url });
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

export const setupPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, password } = req.body;
    const result = await authService.setupPassword(phone, password);
    sendSuccess(res, result.message, { userType: result.userType });
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
