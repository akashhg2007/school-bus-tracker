import { Request, Response, NextFunction } from 'express';
import * as tripService from './trip.service';
import { sendSuccess } from '../../utils/response';

export const startTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busId, type } = req.body;
    const driverId = req.user!.userId;

    const trip = await tripService.startTrip({
      busId,
      driverId,
      type,
    });

    sendSuccess(res, 'Trip started successfully', trip, 201);
  } catch (error) {
    next(error);
  }
};

export const endTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const trip = await tripService.endTrip(id);
    sendSuccess(res, 'Trip ended successfully', trip);
  } catch (error) {
    next(error);
  }
};

export const getActiveTrips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;

    const trips = await tripService.getActiveTrips(schoolId);
    sendSuccess(res, 'Active trips retrieved successfully', trips);
  } catch (error) {
    next(error);
  }
};

export const getTripHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await tripService.getTripHistory(schoolId, page, limit);
    sendSuccess(res, 'Trip history retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getTripById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const trip = await tripService.getTripById(id);
    sendSuccess(res, 'Trip retrieved successfully', trip);
  } catch (error) {
    next(error);
  }
};

export const getDriverTrips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await tripService.getDriverTrips(driverId, page, limit);
    sendSuccess(res, 'Driver trips retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};
