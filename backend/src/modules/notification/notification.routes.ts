import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as notificationController from './notification.controller';

const router = Router();

// Validation rules
const sendNotificationValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID'),
  body('userType')
    .notEmpty()
    .withMessage('User type is required')
    .isIn(['PARENT', 'DRIVER', 'ADMIN'])
    .withMessage('Invalid user type'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string'),
  body('body')
    .notEmpty()
    .withMessage('Body is required')
    .isString()
    .withMessage('Body must be a string'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object'),
];

const sendSchoolNotificationValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string'),
  body('body')
    .notEmpty()
    .withMessage('Body is required')
    .isString()
    .withMessage('Body must be a string'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object'),
];

// Routes
router.get('/', authenticate, notificationController.getNotifications);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.post('/send', authenticate, authorize('ADMIN'), validate(sendNotificationValidation), notificationController.sendNotification);
router.post('/school', authenticate, authorize('ADMIN'), validate(sendSchoolNotificationValidation), notificationController.sendSchoolNotification);

export default router;
