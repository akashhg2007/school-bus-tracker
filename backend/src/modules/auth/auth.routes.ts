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
];

const fcmTokenValidation = [
  body('fcmToken')
    .notEmpty()
    .withMessage('FCM token is required'),
];

// Routes
router.post('/send-otp', validate(sendOtpValidation), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpValidation), authController.verifyOtp);
router.post('/refresh-token', authenticate, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/fcm-token', authenticate, validate(fcmTokenValidation), authController.updateFcmToken);

export default router;
