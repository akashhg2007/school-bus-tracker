import { Request, Response, NextFunction } from 'express';
import * as leaveService from './leave.service';
import { sendSuccess } from '../../utils/response';

export const createLeaveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parentId = req.user!.userId;
    const { studentId, date, reason } = req.body;

    const leave = await leaveService.createLeaveRequest({ studentId, parentId, date, reason });
    sendSuccess(res, 'Leave request submitted successfully', leave, 201);
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.userType === 'ADMIN') {
      const schoolId = req.user!.schoolId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await leaveService.getSchoolLeaveRequests(schoolId, page, limit);
      sendSuccess(res, 'Leave requests retrieved successfully', result);
      return;
    }

    const parentId = req.user!.userId;
    const leaves = await leaveService.getParentLeaveRequests(parentId);
    sendSuccess(res, 'Leave requests retrieved successfully', leaves);
  } catch (error) {
    next(error);
  }
};

export const updateLeaveStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const leave = await leaveService.updateLeaveStatus(id, status);
    sendSuccess(res, 'Leave request updated successfully', leave);
  } catch (error) {
    next(error);
  }
};