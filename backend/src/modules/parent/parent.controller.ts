import { Request, Response, NextFunction } from 'express';
import * as parentService from './parent.service';
import { sendSuccess } from '../../utils/response';

export const createParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { name, phone, email, password } = req.body;

    const parent = await parentService.createParent({ name, phone, email, password, schoolId });
    sendSuccess(res, 'Parent created successfully', parent, 201);
  } catch (error) {
    next(error);
  }
};

export const getParents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await parentService.getParentsBySchool(schoolId, page, limit);
    sendSuccess(res, 'Parents retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getParentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const parent = await parentService.getParentById(id);

    if (parent.schoolId !== req.user!.schoolId) {
      return sendSuccess(res, 'Parent retrieved successfully', null);
    }
    sendSuccess(res, 'Parent retrieved successfully', parent);
  } catch (error) {
    next(error);
  }
};

export const updateParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, email, password } = req.body;

    const parent = await parentService.updateParent(id, { name, phone, email, password }, req.user!.schoolId);
    sendSuccess(res, 'Parent updated successfully', parent);
  } catch (error) {
    next(error);
  }
};

export const deleteParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await parentService.deleteParent(id, req.user!.schoolId);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};