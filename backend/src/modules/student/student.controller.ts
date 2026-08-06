import { Request, Response, NextFunction } from 'express';
import * as studentService from './student.service';
import { sendSuccess } from '../../utils/response';

export const createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, rollNumber, parentId, busId, stopId } = req.body;

    const student = await studentService.createStudent({
      name,
      rollNumber,
      parentId,
      busId,
      stopId,
    });

    sendSuccess(res, 'Student created successfully', student, 201);
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.user!.schoolId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await studentService.getStudentsBySchool(schoolId, page, limit);
    sendSuccess(res, 'Students retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);
    sendSuccess(res, 'Student retrieved successfully', student);
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, rollNumber, busId, stopId } = req.body;

    const student = await studentService.updateStudent(id, {
      name,
      rollNumber,
      busId,
      stopId,
    });

    sendSuccess(res, 'Student updated successfully', student);
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await studentService.deleteStudent(id);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const assignStudentToBus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { busId, stopId } = req.body;

    const student = await studentService.assignStudentToBus(id, busId, stopId);
    sendSuccess(res, 'Student assigned to bus successfully', student);
  } catch (error) {
    next(error);
  }
};

export const getStudentsByBus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { busId } = req.params;
    const students = await studentService.getStudentsByBus(busId);
    sendSuccess(res, 'Students retrieved successfully', students);
  } catch (error) {
    next(error);
  }
};

export const getParentStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parentId = req.user!.userId;
    const students = await studentService.getParentStudents(parentId);
    sendSuccess(res, 'Students retrieved successfully', students);
  } catch (error) {
    next(error);
  }
};
