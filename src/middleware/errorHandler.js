import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  const correlationId = req.correlationId;

  if (err instanceof ApiError) {
    logError(err, req, err.statusCode >= 500 ? 'error' : 'warn');
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        details: err.details,
        correlationId,
      },
    });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    logError(err, req, 'warn');
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details,
        correlationId,
      },
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    logError(err, req, 'warn');
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request body',
      error: {
        code: 'INVALID_JSON',
        details: null,
        correlationId,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, req, res, correlationId);
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logError(err, req, 'error');
    return res.status(503).json({
      success: false,
      message: 'Database unavailable',
      error: {
        code: 'DATABASE_UNAVAILABLE',
        details: null,
        correlationId,
      },
    });
  }

  logError(err, req, 'error');

  return res.status(500).json({
    success: false,
    message: env.isProduction ? 'Unexpected server error' : err.message || 'Unexpected server error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      details: env.isProduction ? null : { name: err.name },
      correlationId,
    },
  });
}

function handlePrismaError(err, req, res, correlationId) {
  logError(err, req, 'warn');

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate resource',
      error: {
        code: 'CONFLICT',
        details: { target: err.meta?.target ?? null },
        correlationId,
      },
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Related resource constraint violated',
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        details: null,
        correlationId,
      },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
      error: {
        code: 'NOT_FOUND',
        details: null,
        correlationId,
      },
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Database request failed',
    error: {
      code: 'DATABASE_ERROR',
      details: env.isProduction ? null : { code: err.code },
      correlationId,
    },
  });
}

function logError(err, req, level) {
  logger[level]({
    err,
    correlationId: req.correlationId,
    method: req.method,
    path: req.originalUrl,
  });
}
