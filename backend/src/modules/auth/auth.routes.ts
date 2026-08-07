import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as authController from './auth.controller';

const router = Router();

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

const sendOtpValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(phoneRegex)
    .withMessage('Invalid phone number format'),
];

const verifyOtpValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(phoneRegex)
    .withMessage('Invalid phone number format'),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be 4-6 digits')
    .isNumeric()
    .withMessage('OTP must be numeric'),
];

const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required')
    .isLength({ max: 254 })
    .withMessage('Identifier too long'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
];

const registerValidation = [
  body('userType')
    .notEmpty()
    .withMessage('User type is required')
    .isIn(['PARENT', 'DRIVER', 'ADMIN'])
    .withMessage('User type must be PARENT, DRIVER, or ADMIN'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(phoneRegex)
    .withMessage('Invalid phone number format'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
  body('schoolId')
    .notEmpty()
    .withMessage('School ID is required')
    .isUUID()
    .withMessage('School ID must be a valid UUID'),
  body('licenseNumber')
    .if(body('userType').equals('DRIVER'))
    .notEmpty()
    .withMessage('License number is required for drivers'),
];

const activateValidation = [
  body('token')
    .notEmpty()
    .withMessage('Activation token is required')
    .isLength({ min: 32 })
    .withMessage('Invalid activation token'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
];

const fcmTokenValidation = [
  body('fcmToken')
    .notEmpty()
    .withMessage('FCM token is required'),
];

const setupValidation = [
  body('name')
    .notEmpty()
    .withMessage('Admin name is required')
    .isLength({ min: 1, max: 100 }),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(phoneRegex)
    .withMessage('Invalid phone number format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
];

// First admin setup (no auth required - one-time bootstrap)
router.post('/setup', validate(setupValidation), authController.setupFirstAdmin);

// Legacy OTP routes (kept for backward compat)
router.post('/send-otp', validate(sendOtpValidation), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpValidation), authController.verifyOtp);

// Setup password (admin-only for bootstrapping users)
router.post('/setup-password', authenticate, authorize('ADMIN'), [
  body('phone').notEmpty().withMessage('Phone number is required').matches(phoneRegex).withMessage('Invalid phone number format'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], authController.setupPassword);

// New password-based routes
router.post('/login', validate(loginValidation), authController.login);
router.post('/register', authenticate, authorize('ADMIN'), validate(registerValidation), authController.register);
router.post('/activate', validate(activateValidation), authController.activate);
router.post('/generate-activation', authenticate, authorize('ADMIN'), authController.generateActivation);

// Common routes
router.get('/me', authenticate, authController.getMe);
router.post('/refresh-token', authenticate, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/fcm-token', authenticate, validate(fcmTokenValidation), authController.updateFcmToken);

export default router;
