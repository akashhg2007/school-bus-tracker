import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    version: string;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const API_VERSION = 'v1';

const getMeta = (req: any) => ({
  requestId: req.headers?.['x-request-id'],
  timestamp: new Date().toISOString(),
  version: API_VERSION,
});

// Backward-compatible: sendSuccess(res, message, data, statusCode) OR sendSuccess(res, data, statusCode)
export const sendSuccess = <T>(res: Response, messageOrData?: string | T, dataOrStatus?: T | number, statusCode?: number): void => {
  let data: T | undefined;
  let status = 200;

  if (typeof messageOrData === 'string') {
    // Old pattern: sendSuccess(res, 'message', data, statusCode)
    data = dataOrStatus as T;
    status = statusCode || 200;
  } else {
    // New pattern: sendSuccess(res, data, statusCode)
    data = messageOrData;
    status = (dataOrStatus as number) || 200;
  }

  const response: ApiResponse<T> = {
    success: true,
    meta: getMeta(res.req),
  };
  if (data !== undefined) {
    response.data = data;
  }
  res.status(status).json(response);
};

export const sendCreated = <T>(res: Response, data?: T): void => {
  sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): void => {
  res.status(204).end();
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any[]
): void => {
  const response: ApiResponse = {
    success: false,
    error: { code, message, details },
    meta: getMeta(res.req),
  };
  res.status(statusCode).json(response);
};

// Backward-compatible: sendPaginated(res, data, total, page, limit)
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): void => {
  const totalPages = Math.ceil(total / limit);
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta: getMeta(res.req),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
  res.status(200).json(response);
};

export default { sendSuccess, sendCreated, sendNoContent, sendError, sendPaginated };
