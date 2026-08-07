import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as parentController from './parent.controller';

const router = Router();

const createParentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string'),
  body('phone')
    .notEmpty()
    .withMessage('Phone is required')
    .isString()
    .withMessage('Phone must be a string')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be 10-15 digits'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Invalid email'),
  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const updateParentValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  body('phone')
    .optional()
    .isString()
    .withMessage('Phone must be a string')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be 10-15 digits'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Invalid email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Routes
router.get('/', authenticate, authorize('ADMIN'), parentController.getParents);
router.post('/', authenticate, authorize('ADMIN'), validate(createParentValidation), parentController.createParent);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateParentValidation), parentController.updateParent);
router.delete('/:id', authenticate, authorize('ADMIN'), parentController.deleteParent);

export default router;
