import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as locationController from './location.controller';

const router = Router();

// Validation rules
const locationUpdateValidation = [
  body('tripId')
    .notEmpty()
    .withMessage('Trip ID is required')
    .isUUID()
    .withMessage('Invalid trip ID'),
  body('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('speed')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Speed must be a positive number'),
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage('Heading must be between 0 and 360'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number'),
];

// Routes
router.post('/update', authenticate, authorize('DRIVER'), validate(locationUpdateValidation), locationController.updateLocation);
router.get('/bus/:busId', authenticate, authorize('ADMIN', 'PARENT'), locationController.getBusLocation);
router.get('/trip/:tripId', authenticate, authorize('ADMIN', 'DRIVER'), locationController.getTripLocationHistory);
router.get('/fleet', authenticate, authorize('ADMIN'), locationController.getFleetLocations);

export default router;
