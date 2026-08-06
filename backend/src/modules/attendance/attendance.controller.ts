import { Request, Response, NextFunction } from 'express';
import * as attendanceService from './attendance.service';
import { sendSuccess } from '../../utils/response';

export const markBoarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId, tripId } = req.body;
    const markedBy = req.user!.userId;

    const attendance = await attendanceService.markAttendance({
      studentId,
      tripId,
      type: 'BOARDING',
      markedBy,
    });

    sendSuccess(res, 'Boarding attendance marked successfully', attendance, 201);
  } catch (error) {
    next(error);
  }
};

export const markDropoff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId, tripId } = req.body;
    const markedBy = req.user!.userId;

    const attendance = await attendanceService.markAttendance({
      studentId,
      tripId,
      type: 'DROPOFF',
      markedBy,
    });

    sendSuccess(res, 'Drop-off attendance marked successfully', attendance, 201);
  } catch (error) {
    next(error);
  }
};

export const getTripAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tripId } = req.params;
    const result = await attendanceService.getTripAttendance(tripId);
    sendSuccess(res, 'Trip attendance retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const result = await attendanceService.getAttendanceReport(
      schoolId,
      startDate as string,
      endDate as string
    );

    sendSuccess(res, 'Attendance report retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getParentAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parentId = req.user!.userId;
    const { studentId } = req.params;

    const attendance = await attendanceService.getParentAttendance(parentId, studentId);
    sendSuccess(res, 'Parent attendance retrieved successfully', attendance);
  } catch (error) {
    next(error);
  }
};
