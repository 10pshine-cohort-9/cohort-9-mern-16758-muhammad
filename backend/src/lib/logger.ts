import pino, {
  type DestinationStream,
  type LevelWithSilent,
  type Logger,
  type LoggerOptions,
} from "pino";

const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_PATHS = [
  "password",
  "*.password",
  "body.password",
  "req.body.password",
  "token",
  "*.token",
  "body.token",
  "req.body.token",
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
] as const;

export interface CreateLoggerOptions {
  readonly destination?: DestinationStream;
  readonly level?: LevelWithSilent;
  readonly pretty?: boolean;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const loggerOptions: LoggerOptions = {
    name: "shine-notes-api",
    level: options.level ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...SENSITIVE_PATHS],
      censor: REDACTED_VALUE,
    },
  };

  if (options.pretty === true) {
    return pino({
      ...loggerOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          singleLine: true,
          translateTime: "SYS:standard",
        },
      },
    });
  }

  if (options.destination !== undefined) {
    return pino(loggerOptions, options.destination);
  }

  return pino(loggerOptions);
}
