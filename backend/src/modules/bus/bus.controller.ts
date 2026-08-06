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

    const result = await busService.getBusesBySchool(schoolId, page, limit);
    sendSuccess(res, 'Buses retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getBusById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const bus = await busService.getBusById(id);
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
    });

    sendSuccess(res, 'Bus updated successfully', bus);
  } catch (error) {
    next(error);
  }
};

export const deleteBus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await busService.deleteBus(id);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const getBusLiveLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const location = await busService.getBusLiveLocation(id);
    sendSuccess(res, 'Bus location retrieved successfully', location);
  } catch (error) {
    next(error);
  }
};
