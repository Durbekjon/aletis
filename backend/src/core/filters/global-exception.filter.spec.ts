import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockTelegramLogger: any;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request & { requestId: string }>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(() => {
    mockTelegramLogger = {
      sendError: jest.fn().mockResolvedValue(true),
    };
    filter = new GlobalExceptionFilter(mockTelegramLogger);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      method: 'GET',
      url: '/api/v1/auth/google/redirect',
      requestId: 'test-req-id',
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1',
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('should map TokenError to BadRequest and not send to Telegram', () => {
    const error = new Error('Bad Request') as any;
    error.name = 'TokenError';
    error.stack = 'stack trace';

    filter.catch(error, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Bad Request',
      requestId: 'test-req-id',
    }));
    expect(mockTelegramLogger.sendError).not.toHaveBeenCalled();
  });

  it('should map generic errors to InternalServerError and send to Telegram', () => {
    const error = new Error('Something went wrong');
    error.name = 'Error';

    filter.catch(error, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong',
    }));
    expect(mockTelegramLogger.sendError).toHaveBeenCalled();
  });
});
