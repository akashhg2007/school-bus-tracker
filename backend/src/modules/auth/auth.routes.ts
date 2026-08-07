import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate } from '../../middleware/auth';
import * as authController from './auth.controller';

const router = Router();

// Validation rules (relaxed for dev mode)
const sendOtpValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required'),
];

const verifyOtpValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('otp')
    .optional()
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be 4-6 digits')
    .isNumeric()
    .withMessage('OTP must be numeric'),
];

const fcmTokenValidation = [
  body('fcmToken')
    .notEmpty()
    .withMessage('FCM token is required'),
];

// Routes
router.get('/me', authenticate, authController.getMe);
router.post('/send-otp', validate(sendOtpValidation), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpValidation), authController.verifyOtp);
router.post('/refresh-token', authenticate, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/fcm-token', authenticate, validate(fcmTokenValidation), authController.updateFcmToken);

export default router;
