import "dotenv/config";

import { createServer, type Server } from "node:http";

import pino, { type Logger } from "pino";

import { createApp } from "./app.js";
import { AuthenticationService } from "./auth/auth-service.js";
import { loadEnvironment } from "./config/env.js";
import { createDatabaseClient } from "./lib/database.js";
import { createLogger } from "./lib/logger.js";
import { NoteService } from "./notes/note-service.js";
import { PrismaAuthenticationRepository } from "./repositories/auth-repository.js";
import { NoteRepository } from "./repositories/note-repository.js";
import { createAuthRouter } from "./routes/auth-routes.js";
import { createNoteRouter } from "./routes/note-routes.js";

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

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function registerShutdownHandlers(
  server: Server,
  logger: Logger,
  timeoutMs: number,
  disconnectDatabase: () => Promise<void>,
): void {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info({ signal }, "Shutdown requested");

    const timeout = setTimeout(() => {
      const synchronousLogger = createLogger({
        destination: pino.destination({
          dest: process.stderr.fd,
          sync: true,
        }),
      });

      synchronousLogger.fatal({ timeoutMs }, "Graceful shutdown timed out");
      process.exit(1);
    }, timeoutMs);
    timeout.unref();

    try {
      await closeServer(server);
      logger.info("HTTP server stopped");
    } catch (error: unknown) {
      logger.error({ err: error }, "HTTP server failed to close cleanly");
      process.exitCode = 1;
    }

    try {
      await disconnectDatabase();
    } catch (error: unknown) {
      logger.error({ err: error }, "Database failed to disconnect cleanly");
      process.exitCode = 1;
    }

    clearTimeout(timeout);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

async function main(): Promise<void> {
  const environment = loadEnvironment();
  const logger = createLogger({
    level: environment.LOG_LEVEL,
    pretty: environment.NODE_ENV === "development",
  });
  const database = createDatabaseClient(environment.DATABASE_URL);
  const authenticationRepository = new PrismaAuthenticationRepository(database);
  const authenticationService = new AuthenticationService(
    authenticationRepository,
  );
  const noteRepository = new NoteRepository(database);
  const noteService = new NoteService(noteRepository);
  const app = createApp({
    logger,
    registerRoutes(expressApp) {
      expressApp.use(
        "/api/auth",
        createAuthRouter(
          authenticationService,
          environment.NODE_ENV === "production",
        ),
      );
      expressApp.use(
        "/api/notes",
        createNoteRouter(authenticationService, noteService),
      );
    },
  });
  const server = createServer(app);

  try {
    await listen(server, environment.PORT, environment.HOST);
  } catch (error: unknown) {
    await database.$disconnect().catch((disconnectError: unknown) => {
      logger.error(
        { err: disconnectError },
        "Database failed to disconnect after startup failure",
      );
    });
    throw error;
  }

  registerShutdownHandlers(
    server,
    logger,
    environment.SHUTDOWN_TIMEOUT_MS,
    () => database.$disconnect(),
  );

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
