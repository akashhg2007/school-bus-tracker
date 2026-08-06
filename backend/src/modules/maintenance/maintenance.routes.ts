import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as maintenanceController from './maintenance.controller';

const router = Router();

const createMaintenanceValidation = [
  body('busId')
    .notEmpty()
    .withMessage('Bus ID is required')
    .isUUID()
    .withMessage('Invalid bus ID'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ max: 200 })
    .withMessage('Title too long'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 1000 })
    .withMessage('Description too long'),
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Invalid date (use YYYY-MM-DD)'),
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'COMPLETED'])
    .withMessage('Status must be PENDING or COMPLETED'),
];

// Routes
router.get('/', authenticate, authorize('ADMIN'), maintenanceController.getMaintenance);
router.post('/', authenticate, authorize('ADMIN'), validate(createMaintenanceValidation), maintenanceController.createMaintenance);
router.put('/:id/status', authenticate, authorize('ADMIN'), validate(updateStatusValidation), maintenanceController.updateMaintenanceStatus);
router.delete('/:id', authenticate, authorize('ADMIN'), maintenanceController.deleteMaintenance);

export default router;