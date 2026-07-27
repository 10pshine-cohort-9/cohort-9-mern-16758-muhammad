import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import type { Logger } from "pino";

interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId: string;
  };
}

export class HttpError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  public constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function asError(value: unknown): Error {
  return value instanceof Error
    ? value
    : new Error("A non-Error value was thrown");
}

function asExpectedError(error: Error): HttpError | undefined {
  if (error instanceof HttpError) {
    return error;
  }

  const errorType = (error as Error & { readonly type?: unknown }).type;

  if (errorType === "entity.parse.failed") {
    return new HttpError(
      400,
      "INVALID_JSON",
      "Request body contains invalid JSON.",
    );
  }

  if (errorType === "entity.too.large") {
    return new HttpError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body is too large.",
    );
  }

  return undefined;
}

function getRequestId(request: Request): string {
  const requestId = (request as Request & { readonly id?: unknown }).id;

  return typeof requestId === "string" || typeof requestId === "number"
    ? String(requestId)
    : "unknown";
}

function getRequestLogger(request: Request, fallbackLogger: Logger): Logger {
  const requestLogger = (request as unknown as { readonly log?: Logger }).log;
  return requestLogger ?? fallbackLogger;
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new HttpError(404, "NOT_FOUND", "Route not found."));
};

export function createErrorHandler(
  fallbackLogger: Logger,
): ErrorRequestHandler {
  return (error, request, response, next): void => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const normalizedError = asError(error);
    const expectedError = asExpectedError(normalizedError);
    const statusCode = expectedError?.statusCode ?? 500;
    const code = expectedError?.code ?? "INTERNAL_SERVER_ERROR";
    const message = expectedError?.message ?? "An unexpected error occurred.";
    const requestId = getRequestId(request);
    const logger = getRequestLogger(request, fallbackLogger);
    const context = {
      err: normalizedError,
      code,
      requestId,
      statusCode,
    };

    if (statusCode >= 500) {
      logger.error(context, "Request failed unexpectedly");
    } else {
      logger.warn(context, "Request failed");
    }

    const payload: ErrorResponse = {
      error: {
        code,
        message,
        requestId,
      },
    };

    response.status(statusCode).json(payload);
  };
}
