import { Request, Response, NextFunction } from 'express';
import * as parentService from './parent.service';
import { sendSuccess } from '../../utils/response';

export const createParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const { name, phone, email } = req.body;

    const parent = await parentService.createParent({ name, phone, email, schoolId });
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

export const updateParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    const parent = await parentService.updateParent(id, { name, phone, email });
    sendSuccess(res, 'Parent updated successfully', parent);
  } catch (error) {
    next(error);
  }
};

export const deleteParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await parentService.deleteParent(id);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};