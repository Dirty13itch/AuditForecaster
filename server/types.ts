import { Request, Response, NextFunction } from 'express';
import type { User } from '../shared/schema';

// Authenticated request with user session
export interface AuthenticatedRequest extends Request {
  user?: User & {
    claims?: {
      sub: string;
      email: string;
      first_name?: string;
      last_name?: string;
    };
  };
  // Use a loose session typing to avoid conflict with express-session declarations
  session?: any;
}

// Request handler type for authenticated routes
export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next?: NextFunction
) => Promise<void> | void;

// Request handler type for unauthenticated routes
export type RequestHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void> | void;

// Common error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: ValidationError[];
}

// Standard API error response format
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: ValidationError[] | Record<string, any>;
  timestamp?: string;
  path?: string;
}

// Standard API success response format
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}
