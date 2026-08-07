import { randomUUID } from "node:crypto";

import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import { createLogger } from "./lib/logger.js";
import {
  createErrorHandler,
  notFoundHandler,
} from "./middleware/error-handler.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

export interface CreateAppOptions {
  readonly logger?: Logger;
  readonly registerRoutes?: (app: Express) => void;
}

function createRequestId(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  return candidate !== undefined && REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
}

export function createApp(options: CreateAppOptions = {}): Express {
  const logger = options.logger ?? createLogger();
  const app = express();

  app.disable("x-powered-by");

  app.use(
    pinoHttp({
      logger,
      genReqId(request, response) {
        const requestId = createRequestId(request.headers["x-request-id"]);
        response.setHeader("x-request-id", requestId);
        return requestId;
      },
    }),
  );
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request, response) => {
    response.setHeader("cache-control", "no-store");
    response.status(200).json({ status: "ok" });
  });

  options.registerRoutes?.(app);

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
