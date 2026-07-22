import { createServer, type Server } from "node:http";

import type { Logger } from "pino";

import { createApp } from "./app.js";
import { loadEnvironment } from "./config/env.js";
import { createLogger } from "./lib/logger.js";

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleError = (error: Error): void => {
      reject(error);
    };

    server.once("error", handleError);
    server.listen(port, host, () => {
      server.off("error", handleError);
      resolve();
    });
  });
}

function registerShutdownHandlers(
  server: Server,
  logger: Logger,
  timeoutMs: number,
): void {
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info({ signal }, "Shutdown requested");

    const timeout = setTimeout(() => {
      logger.fatal({ timeoutMs }, "Graceful shutdown timed out");
      process.exit(1);
    }, timeoutMs);
    timeout.unref();

    server.close((error) => {
      clearTimeout(timeout);

      if (error !== undefined) {
        logger.error({ err: error }, "HTTP server failed to close cleanly");
        process.exitCode = 1;
        return;
      }

      logger.info("HTTP server stopped");
    });
  };

  process.once("SIGINT", () => {
    shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    shutdown("SIGTERM");
  });
}

async function main(): Promise<void> {
  const environment = loadEnvironment();
  const logger = createLogger({
    level: environment.LOG_LEVEL,
    pretty: environment.NODE_ENV === "development",
  });
  const server = createServer(createApp({ logger }));

  await listen(server, environment.PORT, environment.HOST);
  registerShutdownHandlers(server, logger, environment.SHUTDOWN_TIMEOUT_MS);

  logger.info(
    {
      environment: environment.NODE_ENV,
      host: environment.HOST,
      port: environment.PORT,
    },
    "HTTP server started",
  );
}

void main().catch((error: unknown) => {
  const logger = createLogger();
  const normalizedError =
    error instanceof Error ? error : new Error("Unknown startup failure");

  logger.fatal({ err: normalizedError }, "Application failed to start");
  process.exitCode = 1;
});
