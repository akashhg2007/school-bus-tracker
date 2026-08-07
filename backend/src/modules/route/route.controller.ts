import { Request, Response, NextFunction } from 'express';
import * as routeService from './route.service';
import { sendSuccess } from '../../utils/response';

export const createRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, stops } = req.body;
    const schoolId = req.user!.schoolId;

    const route = await routeService.createRoute({
      name,
      schoolId,
      stops,
    });

    sendSuccess(res, 'Route created successfully', route, 201);
  } catch (error) {
    next(error);
  }
};

export const getRoutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await routeService.getRoutesBySchool(schoolId, page, limit);
    sendSuccess(res, 'Routes retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getRouteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const route = await routeService.getRouteById(id, req.user?.schoolId);
    sendSuccess(res, 'Route retrieved successfully', route);
  } catch (error) {
    next(error);
  }
};

export const updateRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const route = await routeService.updateRoute(id, { name });
    sendSuccess(res, 'Route updated successfully', route);
  } catch (error) {
    next(error);
  }
};

export const deleteRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await routeService.deleteRoute(id);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const addStop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude } = req.body;

    const stop = await routeService.addStop(id, {
      name,
      latitude,
      longitude,
    });

    sendSuccess(res, 'Stop added successfully', stop, 201);
  } catch (error) {
    next(error);
  }
};

export const updateStop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { stopId } = req.params;
    const { name, latitude, longitude, order } = req.body;

    const stop = await routeService.updateStop(stopId, {
      name,
      latitude,
      longitude,
      order,
    });

    sendSuccess(res, 'Stop updated successfully', stop);
  } catch (error) {
    next(error);
  }
};

export const deleteStop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { stopId } = req.params;
    const result = await routeService.deleteStop(stopId);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};
