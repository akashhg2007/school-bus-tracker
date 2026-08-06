import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as tripController from './trip.controller';

const router = Router();

// Validation rules
const startTripValidation = [
  body('busId')
    .notEmpty()
    .withMessage('Bus ID is required')
    .isUUID()
    .withMessage('Invalid bus ID'),
  body('type')
    .notEmpty()
    .withMessage('Trip type is required')
    .isIn(['MORNING', 'EVENING'])
    .withMessage('Trip type must be MORNING or EVENING'),
];

// Routes
router.post('/start', authenticate, authorize('DRIVER'), validate(startTripValidation), tripController.startTrip);
router.post('/:id/end', authenticate, authorize('DRIVER'), tripController.endTrip);
router.get('/active', authenticate, authorize('ADMIN'), tripController.getActiveTrips);
router.get('/history', authenticate, authorize('ADMIN'), tripController.getTripHistory);
router.get('/my-trips', authenticate, authorize('DRIVER'), tripController.getDriverTrips);
router.get('/:id', authenticate, authorize('ADMIN', 'DRIVER'), tripController.getTripById);

export default router;
