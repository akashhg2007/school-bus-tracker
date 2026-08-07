import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  requestId?: string;
}

export const sendSuccess = <T>(res: Response, message: string, data?: T, statusCode: number = 200): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
  };
  if (data !== undefined) {
    response.data = data;
  }
  const requestId = (res.req as any)?.headers?.['x-request-id'];
  if (requestId) response.requestId = requestId;
  res.status(statusCode).json(response);
};

export const sendError = (res: Response, message: string, statusCode: number = 500, error?: string): void => {
  const response: ApiResponse = {
    success: false,
    message,
  };
  if (error) response.error = error;
  const requestId = (res.req as any)?.headers?.['x-request-id'];
  if (requestId) response.requestId = requestId;
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
