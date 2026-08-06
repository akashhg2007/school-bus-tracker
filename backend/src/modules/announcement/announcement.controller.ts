import { Request, Response, NextFunction } from 'express';
import * as announcementService from './announcement.service';
import { sendSuccess } from '../../utils/response';

export const createAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { title, body } = req.body;

    const announcement = await announcementService.createAnnouncement({ schoolId, title, body });
    sendSuccess(res, 'Announcement published successfully', announcement, 201);
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await announcementService.getSchoolAnnouncements(schoolId, page, limit);
    sendSuccess(res, 'Announcements retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { id } = req.params;

    const result = await announcementService.deleteAnnouncement(id, schoolId);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};