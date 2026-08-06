import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import * as announcementController from './announcement.controller';

const router = Router();

const createAnnouncementValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .isLength({ max: 200 })
    .withMessage('Title too long'),
  body('body')
    .notEmpty()
    .withMessage('Body is required')
    .isString()
    .withMessage('Body must be a string')
    .isLength({ max: 2000 })
    .withMessage('Body too long'),
];

// Routes
router.get('/', authenticate, authorize('ADMIN', 'PARENT', 'DRIVER'), announcementController.getAnnouncements);
router.post('/', authenticate, authorize('ADMIN'), validate(createAnnouncementValidation), announcementController.createAnnouncement);
router.delete('/:id', authenticate, authorize('ADMIN'), announcementController.deleteAnnouncement);

export default router;