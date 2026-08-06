import { Request, Response, NextFunction } from 'express';
import * as driverService from './driver.service';
import { sendSuccess } from '../../utils/response';

export const createDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone, licenseNumber, email } = req.body;
    const schoolId = req.user!.schoolId;

    const driver = await driverService.createDriver({
      name,
      phone,
      licenseNumber,
      email,
      schoolId,
    });

    sendSuccess(res, 'Driver created successfully', driver, 201);
  } catch (error) {
    next(error);
  }
};

export const getDrivers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await driverService.getDriversBySchool(schoolId, page, limit);
    sendSuccess(res, 'Drivers retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getDriverById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await driverService.getDriverById(id);
    sendSuccess(res, 'Driver retrieved successfully', driver);
  } catch (error) {
    next(error);
  }
};

export const updateDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, licenseNumber, email, isActive } = req.body;

    const driver = await driverService.updateDriver(id, {
      name,
      phone,
      licenseNumber,
      email,
      isActive,
    });

    sendSuccess(res, 'Driver updated successfully', driver);
  } catch (error) {
    next(error);
  }
};

export const deleteDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await driverService.deleteDriver(id);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const getDriverProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = req.user!.userId;
    const driver = await driverService.getDriverProfile(driverId);
    sendSuccess(res, 'Driver profile retrieved successfully', driver);
  } catch (error) {
    next(error);
  }
};
