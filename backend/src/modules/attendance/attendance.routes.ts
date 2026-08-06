import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as attendanceController from './attendance.controller';

const router = Router();

// Validation rules
const markAttendanceValidation = [
  body('studentId')
    .notEmpty()
    .withMessage('Student ID is required')
    .isUUID()
    .withMessage('Invalid student ID'),
  body('tripId')
    .notEmpty()
    .withMessage('Trip ID is required')
    .isUUID()
    .withMessage('Invalid trip ID'),
];

const attendanceReportValidation = [
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
];

// Routes
router.post('/board', authenticate, authorize('DRIVER'), validate(markAttendanceValidation), attendanceController.markBoarding);
router.post('/drop', authenticate, authorize('DRIVER'), validate(markAttendanceValidation), attendanceController.markDropoff);
router.get('/trip/:tripId', authenticate, authorize('ADMIN', 'DRIVER'), attendanceController.getTripAttendance);
router.get('/report', authenticate, authorize('ADMIN'), validate(attendanceReportValidation), attendanceController.getAttendanceReport);
router.get('/parent/:studentId', authenticate, authorize('PARENT'), attendanceController.getParentAttendance);

export default router;
