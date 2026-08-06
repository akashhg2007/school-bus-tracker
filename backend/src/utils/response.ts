import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const sendSuccess = <T>(res: Response, message: string, data?: T, statusCode: number = 200): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data && { data }),
  };
  res.status(statusCode).json(response);
};

export const sendError = (res: Response, message: string, statusCode: number = 500, error?: string): void => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  message: string,
  data: T[],
  total: number,
  page: number,
  limit: number
): void => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
  res.status(200).json(response);
};
