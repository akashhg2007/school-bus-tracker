import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as driverController from './driver.controller';

const router = Router();

const createDriverValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
  body('licenseNumber')
    .notEmpty()
    .withMessage('License number is required')
    .isString()
    .withMessage('License number must be a string'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Invalid email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const updateDriverValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
  body('licenseNumber')
    .optional()
    .isString()
    .withMessage('License number must be a string'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Invalid email'),
  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

router.get('/', authenticate, authorize('ADMIN'), driverController.getDrivers);
router.get('/profile', authenticate, authorize('DRIVER'), driverController.getDriverProfile);
router.get('/:id', authenticate, authorize('ADMIN'), driverController.getDriverById);
router.post('/', authenticate, authorize('ADMIN'), validate(createDriverValidation), driverController.createDriver);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateDriverValidation), driverController.updateDriver);
router.delete('/:id', authenticate, authorize('ADMIN'), driverController.deleteDriver);

export default router;
