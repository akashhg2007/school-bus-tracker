import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as leaveController from './leave.controller';

const router = Router();

const createLeaveValidation = [
  body('studentId')
    .notEmpty()
    .withMessage('Student ID is required')
    .isUUID()
    .withMessage('Invalid student ID'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format (use YYYY-MM-DD)'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason too long'),
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['APPROVED', 'REJECTED'])
    .withMessage('Invalid status'),
];

// Routes
router.post('/', authenticate, authorize('PARENT'), validate(createLeaveValidation), leaveController.createLeaveRequest);
router.get('/', authenticate, authorize('PARENT', 'ADMIN'), leaveController.getLeaveRequests);
router.put('/:id/status', authenticate, authorize('ADMIN'), validate(updateStatusValidation), leaveController.updateLeaveStatus);

export default router;