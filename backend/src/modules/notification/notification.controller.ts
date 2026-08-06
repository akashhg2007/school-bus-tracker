import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service';
import { sendSuccess } from '../../utils/response';

export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.userType;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await notificationService.getUserNotifications(userId, userType, page, limit);
    sendSuccess(res, 'Notifications retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await notificationService.markAsRead(id);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.userType;
    const result = await notificationService.markAllAsRead(userId, userType);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const sendNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, userType, title, body, data } = req.body;

    const notification = await notificationService.sendNotification({
      userId,
      userType,
      title,
      body,
      data,
    });

    sendSuccess(res, 'Notification sent successfully', notification, 201);
  } catch (error) {
    next(error);
  }
};

export const sendSchoolNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { title, body, data } = req.body;

    const result = await notificationService.sendSchoolNotification(schoolId, title, body, data);
    sendSuccess(res, 'School notification sent successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

export const reportIncident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { tripId, type, details } = req.body;

    const result = await notificationService.sendIncidentReport(schoolId, tripId, type, details);
    sendSuccess(res, 'Incident report submitted', result, 201);
  } catch (error) {
    next(error);
  }
};
