import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as routeController from './route.controller';

const router = Router();

// Validation rules
const createRouteValidation = [
  body('name')
    .notEmpty()
    .withMessage('Route name is required')
    .isString()
    .withMessage('Route name must be a string'),
  body('stops')
    .isArray({ min: 2 })
    .withMessage('At least 2 stops are required'),
  body('stops.*.name')
    .notEmpty()
    .withMessage('Stop name is required')
    .isString()
    .withMessage('Stop name must be a string'),
  body('stops.*.latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('stops.*.longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
];

const updateRouteValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Route name must be a string'),
];

const addStopValidation = [
  body('name')
    .notEmpty()
    .withMessage('Stop name is required')
    .isString()
    .withMessage('Stop name must be a string'),
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
];

const updateStopValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Stop name must be a string'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
];

// Routes
router.get('/', authenticate, authorize('ADMIN'), routeController.getRoutes);
router.get('/:id', authenticate, authorize('ADMIN'), routeController.getRouteById);
router.post('/', authenticate, authorize('ADMIN'), validate(createRouteValidation), routeController.createRoute);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateRouteValidation), routeController.updateRoute);
router.delete('/:id', authenticate, authorize('ADMIN'), routeController.deleteRoute);

// Stop routes
router.post('/:id/stops', authenticate, authorize('ADMIN'), validate(addStopValidation), routeController.addStop);
router.put('/stops/:stopId', authenticate, authorize('ADMIN'), validate(updateStopValidation), routeController.updateStop);
router.delete('/stops/:stopId', authenticate, authorize('ADMIN'), routeController.deleteStop);

export default router;
