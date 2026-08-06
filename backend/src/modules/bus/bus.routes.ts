import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as busController from './bus.controller';

const router = Router();

// Validation rules
const createBusValidation = [
  body('busNumber')
    .notEmpty()
    .withMessage('Bus number is required')
    .isString()
    .withMessage('Bus number must be a string'),
  body('plateNumber')
    .notEmpty()
    .withMessage('Plate number is required')
    .isString()
    .withMessage('Plate number must be a string'),
  body('capacity')
    .notEmpty()
    .withMessage('Capacity is required')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  body('routeId')
    .optional()
    .isUUID()
    .withMessage('Invalid route ID'),
  body('gpsDeviceId')
    .optional()
    .isString()
    .withMessage('GPS device ID must be a string'),
];

const updateBusValidation = [
  body('busNumber')
    .optional()
    .isString()
    .withMessage('Bus number must be a string'),
  body('plateNumber')
    .optional()
    .isString()
    .withMessage('Plate number must be a string'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  body('routeId')
    .optional()
    .isUUID()
    .withMessage('Invalid route ID'),
  body('gpsDeviceId')
    .optional()
    .isString()
    .withMessage('GPS device ID must be a string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Routes
router.get('/', authenticate, authorize('ADMIN'), busController.getBuses);
router.get('/:id', authenticate, busController.getBusById);
router.post('/', authenticate, authorize('ADMIN'), validate(createBusValidation), busController.createBus);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateBusValidation), busController.updateBus);
router.delete('/:id', authenticate, authorize('ADMIN'), busController.deleteBus);
router.get('/:id/live-location', authenticate, busController.getBusLiveLocation);

export default router;
