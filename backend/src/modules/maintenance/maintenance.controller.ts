import { Request, Response, NextFunction } from 'express';
import * as maintenanceService from './maintenance.service';
import { sendSuccess } from '../../utils/response';

export const createMaintenance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { busId, title, description, dueDate } = req.body;

    const record = await maintenanceService.createMaintenance({ schoolId, busId, title, description, dueDate });
    sendSuccess(res, 'Maintenance reminder created successfully', record, 201);
  } catch (error) {
    next(error);
  }
};

export const getMaintenance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await maintenanceService.getSchoolMaintenance(schoolId, page, limit);
    sendSuccess(res, 'Maintenance records retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const updateMaintenanceStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { id } = req.params;
    const { status } = req.body;

    const record = await maintenanceService.updateMaintenanceStatus(id, schoolId, status);
    sendSuccess(res, 'Maintenance record updated successfully', record);
  } catch (error) {
    next(error);
  }
};

export const deleteMaintenance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { id } = req.params;

    const result = await maintenanceService.deleteMaintenance(id, schoolId);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};