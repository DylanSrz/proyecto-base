import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/vehicles' }),
    }),
  } as unknown as ArgumentsHost;
  const dbError = (code: string) =>
    new QueryFailedError('INSERT', [], Object.assign(new Error('db'), { code }));

  beforeEach(() => vi.clearAllMocks());

  it('keeps the status and message of an HttpException', () => {
    filter.catch(new NotFoundException('Vehicle x not found'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Vehicle x not found',
        path: '/api/vehicles',
        timestamp: expect.any(String),
      }),
    );
  });

  it('returns the list of validation messages', () => {
    filter.catch(new BadRequestException(['plate must be a string']), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['plate must be a string'] }),
    );
  });

  it.each([
    ['23505', 409],
    ['23503', 400],
    ['22P02', 400],
  ])('maps database error %s to HTTP %i instead of 500', (code, expected) => {
    filter.catch(dbError(code), host);
    expect(status).toHaveBeenCalledWith(expected);
  });

  it('answers unknown errors with a generic 500', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
