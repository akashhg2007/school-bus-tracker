import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as authController from './auth.controller';

const router = Router();

// OTP validation (kept for backward compat)
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

// Password login validation
const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Registration validation
const registerValidation = [
  body('userType')
    .notEmpty()
    .withMessage('User type is required')
    .isIn(['PARENT', 'DRIVER', 'ADMIN'])
    .withMessage('User type must be PARENT, DRIVER, or ADMIN'),
  body('name')
    .notEmpty()
    .withMessage('Name is required'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be 10-15 digits'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('schoolId')
    .notEmpty()
    .withMessage('School ID is required'),
  body('licenseNumber')
    .if(body('userType').equals('DRIVER'))
    .notEmpty()
    .withMessage('License number is required for drivers'),
];

// Activation validation
const activateValidation = [
  body('token')
    .notEmpty()
    .withMessage('Activation token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const fcmTokenValidation = [
  body('fcmToken')
    .notEmpty()
    .withMessage('FCM token is required'),
];

// Legacy OTP routes (kept for backward compat)
router.post('/send-otp', validate(sendOtpValidation), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpValidation), authController.verifyOtp);

// Setup password (for bootstrapping existing users)
router.post('/setup-password', [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], authController.setupPassword);

// New password-based routes
router.post('/login', validate(loginValidation), authController.login);
router.post('/register', authenticate, authorize('ADMIN'), validate(registerValidation), authController.register);
router.post('/activate', validate(activateValidation), authController.activate);
router.post('/generate-activation', authenticate, authController.generateActivation);

// Common routes
router.get('/me', authenticate, authController.getMe);
router.post('/refresh-token', authenticate, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/fcm-token', authenticate, validate(fcmTokenValidation), authController.updateFcmToken);

export default router;
