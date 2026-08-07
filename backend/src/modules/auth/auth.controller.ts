import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';
import { setAuthCookie, clearAuthCookie, revokeToken } from '../../middleware/auth';

export const setupFirstAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { schoolName, name, phone, password } = req.body;
    const result = await authService.setupFirstAdmin(schoolName, name, phone, password);
    setAuthCookie(res, result.token);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.body;
    const result = await authService.sendOtp(phone);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    const result = await authService.verifyOtp(phone, otp);
    // Set httpOnly cookie for web dashboard
    setAuthCookie(res, result.token);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password } = req.body;
    const result = await authService.loginWithPassword(identifier, password);
    // Set httpOnly cookie for web dashboard
    setAuthCookie(res, result.token);
    sendSuccess(res, result);
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
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    const result = await authService.activateAccount(token, password);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const generateActivation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');
    const url = await authService.generateActivationToken(user.userId, user.userType);
    sendSuccess(res, { activationUrl: url });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Try cookie first, then Authorization header
    let token: string | null = null;
    if (req.cookies?.sb_token) {
      token = req.cookies.sb_token;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      throw new Error('No token provided');
    }

    const newToken = refreshTokenUtil(token);
    // Set new cookie
    setAuthCookie(res, newToken);
    sendSuccess(res, { token: newToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Try cookie first, then Authorization header
    let token: string | null = null;
    if (req.cookies?.sb_token) {
      token = req.cookies.sb_token;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (token) {
      revokeToken(token);
    }
    clearAuthCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const setupPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, password } = req.body;
    const schoolId = req.user!.schoolId;
    const result = await authService.setupPassword(phone, password, schoolId);
    sendSuccess(res, result);
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
    sendSuccess(res, { message: 'FCM token updated successfully' });
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
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
};

// Import the refreshToken function from auth module
import { refreshToken as refreshTokenUtil } from '../../middleware/auth';
