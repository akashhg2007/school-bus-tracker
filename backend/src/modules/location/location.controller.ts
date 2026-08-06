import { Request, Response, NextFunction } from 'express';
import * as locationService from './location.service';
import { sendSuccess } from '../../utils/response';

export const updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tripId, latitude, longitude, speed, heading, accuracy } = req.body;

    const location = await locationService.updateLocation(tripId, {
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
    });

    sendSuccess(res, 'Location updated successfully', location);
  } catch (error) {
    next(error);
  }
};

export const getBusLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busId } = req.params;
    const location = await locationService.getBusLocation(busId);
    sendSuccess(res, 'Bus location retrieved successfully', location);
  } catch (error) {
    next(error);
  }
};

export const getTripLocationHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tripId } = req.params;
    const locations = await locationService.getTripLocationHistory(tripId);
    sendSuccess(res, 'Trip location history retrieved successfully', locations);
  } catch (error) {
    next(error);
  }
};

export const getFleetLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const locations = await locationService.getFleetLocations(schoolId);
    sendSuccess(res, 'Fleet locations retrieved successfully', locations);
  } catch (error) {
    next(error);
  }
};
