import { Request, Response, NextFunction } from 'express';
import * as busService from './bus.service';
import { sendSuccess } from '../../utils/response';

export const createBus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busNumber, plateNumber, capacity, driverId, routeId, gpsDeviceId } = req.body;
    const schoolId = req.user!.schoolId;

    const bus = await busService.createBus({
      busNumber,
      plateNumber,
      capacity,
      schoolId,
      driverId,
      routeId,
      gpsDeviceId,
    });

    sendSuccess(res, 'Bus created successfully', bus, 201);
  } catch (error) {
    next(error);
  }
};

export const getBuses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { search, isActive, driverAssigned } = req.query;
    const sortField = req.query.sort as string;
    const sortDir = (req.query.dir as 'asc' | 'desc') || 'desc';

    const result = await busService.getBusesBySchool(schoolId, page, limit, {
      search: search as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      driverAssigned: driverAssigned !== undefined ? driverAssigned === 'true' : undefined,
    }, {
      field: sortField || 'createdAt',
      direction: sortDir,
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBusById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const bus = await busService.getBusById(id, req.user!.schoolId);
    sendSuccess(res, 'Bus retrieved successfully', bus);
  } catch (error) {
    next(error);
  }
};

export const updateBus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { busNumber, plateNumber, capacity, driverId, routeId, gpsDeviceId, isActive } = req.body;

    const bus = await busService.updateBus(id, {
      busNumber,
      plateNumber,
      capacity,
      driverId,
      routeId,
      gpsDeviceId,
      isActive,
    }, req.user!.schoolId);

    sendSuccess(res, 'Bus updated successfully', bus);
  } catch (error) {
    next(error);
  }
};

export const deleteBus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await busService.deleteBus(id, req.user!.schoolId);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const getBusLiveLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const location = await busService.getBusLiveLocation(id, req.user!.schoolId);
    sendSuccess(res, 'Bus location retrieved successfully', location);
  } catch (error) {
    next(error);
  }
};
