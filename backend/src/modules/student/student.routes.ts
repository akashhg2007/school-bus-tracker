import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as studentController from './student.controller';

const router = Router();

// Validation rules
const createStudentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string'),
  body('rollNumber')
    .notEmpty()
    .withMessage('Roll number is required')
    .isString()
    .withMessage('Roll number must be a string'),
  body('parentId')
    .notEmpty()
    .withMessage('Parent ID is required')
    .isUUID()
    .withMessage('Invalid parent ID'),
  body('busId')
    .optional()
    .isUUID()
    .withMessage('Invalid bus ID'),
  body('stopId')
    .optional()
    .isUUID()
    .withMessage('Invalid stop ID'),
];

const updateStudentValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  body('rollNumber')
    .optional()
    .isString()
    .withMessage('Roll number must be a string'),
  body('busId')
    .optional()
    .isUUID()
    .withMessage('Invalid bus ID'),
  body('stopId')
    .optional()
    .isUUID()
    .withMessage('Invalid stop ID'),
];

const assignToBusValidation = [
  body('busId')
    .notEmpty()
    .withMessage('Bus ID is required')
    .isUUID()
    .withMessage('Invalid bus ID'),
  body('stopId')
    .notEmpty()
    .withMessage('Stop ID is required')
    .isUUID()
    .withMessage('Invalid stop ID'),
];

// Routes
router.get('/', authenticate, authorize('ADMIN'), studentController.getStudents);
router.get('/my-children', authenticate, authorize('PARENT'), studentController.getParentStudents);
router.get('/:id', authenticate, authorize('ADMIN'), studentController.getStudentById);
router.post('/', authenticate, authorize('ADMIN'), validate(createStudentValidation), studentController.createStudent);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateStudentValidation), studentController.updateStudent);
router.delete('/:id', authenticate, authorize('ADMIN'), studentController.deleteStudent);
router.post('/:id/assign-bus', authenticate, authorize('ADMIN'), validate(assignToBusValidation), studentController.assignStudentToBus);
router.get('/bus/:busId', authenticate, authorize('ADMIN', 'DRIVER'), studentController.getStudentsByBus);

export default router;
