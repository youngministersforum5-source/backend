import { NextFunction, Request, Response } from "express";
import { isProduction } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Common PostgreSQL error codes we translate into meaningful HTTP statuses.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_CHECK_VIOLATION = "23514";

interface PgErrorLike {
  code?: string;
  message?: string;
}

function isPgErrorLike(err: unknown): err is PgErrorLike {
  return typeof err === "object" && err !== null && "code" in err;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: "Resource not found." });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  let statusCode = 500;
  let message = "An unexpected error occurred.";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (isPgErrorLike(err)) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      statusCode = 409;
      message = "A record with this value already exists.";
    } else if (err.code === PG_FOREIGN_KEY_VIOLATION || err.code === PG_CHECK_VIOLATION) {
      statusCode = 400;
      message = "Invalid request data.";
    }
  }

  logger.error(
    {
      err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
      path: req.path,
      method: req.method,
    },
    "Request error"
  );

  const body: Record<string, unknown> = { success: false, message };

  // Stack traces are never exposed in production.
  if (!isProduction && err instanceof Error) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}
