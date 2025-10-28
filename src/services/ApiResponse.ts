/**
 * Standardized API Response Helper
 * Provides consistent response format across all API endpoints
 */

export interface ApiResponseData {
  success: boolean;
  data: any;
  message: string;
  error: string | null;
  timestamp: string;
  statusCode?: number;
}

export class ApiResponse {
  public success: boolean;
  public data: any;
  public message: string;
  public error: string | null;
  public statusCode: number;
  public timestamp: string;

  constructor(success = true, data = null, message = '', error: string | null = null, statusCode = 200) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  static success(data: any = null, message = 'Success', statusCode = 200): ApiResponse {
    return new ApiResponse(true, data, message, null, statusCode);
  }

  static error(error = 'ServerError', message = 'An error occurred', data: any = null, statusCode = 500): ApiResponse {
    return new ApiResponse(false, data, message, error, statusCode);
  }

  static created(data: any = null, message = 'Resource created successfully'): ApiResponse {
    return new ApiResponse(true, data, message, null, 201);
  }

  static updated(data: any = null, message = 'Resource updated successfully'): ApiResponse {
    return new ApiResponse(true, data, message, null, 200);
  }

  static deleted(message = 'Resource deleted successfully'): ApiResponse {
    return new ApiResponse(true, null, message, null, 200);
  }

  static notFound(message = 'Resource not found'): ApiResponse {
    return new ApiResponse(false, null, message, 'NotFoundError', 404);
  }

  static badRequest(message = 'Bad request', error = 'BadRequestError'): ApiResponse {
    return new ApiResponse(false, null, message, error, 400);
  }

  static unauthorized(message = 'Unauthorized access', error = 'AuthError'): ApiResponse {
    return new ApiResponse(false, null, message, error, 401);
  }

  static forbidden(message = 'Access forbidden', error = 'ForbiddenError'): ApiResponse {
    return new ApiResponse(false, null, message, error, 403);
  }

  static conflict(message = 'Resource conflict', error = 'ConflictError'): ApiResponse {
    return new ApiResponse(false, null, message, error, 409);
  }

  static validationError(message = 'Validation failed', error = 'ValidationError'): ApiResponse {
    return new ApiResponse(false, null, message, error, 422);
  }

  // Method to get plain object for API responses
  toJSON(): ApiResponseData {
    return {
      success: this.success,
      data: this.data,
      message: this.message,
      error: this.error,
      timestamp: this.timestamp,
      statusCode: this.statusCode
    };
  }

  // Method to handle response formatting for different scenarios
  static formatResponse(response: ApiResponse): ApiResponseData {
    return response.toJSON();
  }
}

export default ApiResponse;
