import { Writable } from "node:stream";

import { expect } from "chai";
import { describe, it } from "mocha";
import type { Logger } from "pino";
import request from "supertest";

import { createApp } from "../src/app.js";
import {
  EnvironmentValidationError,
  loadEnvironment,
} from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";

const TEST_DATABASE_URL = "postgresql://user:password@localhost:5432/notes";

function createSilentLogger(): Logger {
  return createLogger({ level: "silent" });
}

describe("application foundation", () => {
  it("reports health without caching the response", async () => {
    const response = await request(
      createApp({ logger: createSilentLogger() }),
    ).get("/health");

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ status: "ok" });
    expect(response.headers["cache-control"]).to.equal("no-store");
  });

  it("sets security headers and does not advertise Express", async () => {
    const response = await request(
      createApp({ logger: createSilentLogger() }),
    ).get("/health");
    const contentSecurityPolicy = response.headers["content-security-policy"];

    expect(contentSecurityPolicy).to.be.a("string");
    expect(contentSecurityPolicy).to.include("default-src 'self'");
    expect(contentSecurityPolicy).to.include("object-src 'none'");
    expect(contentSecurityPolicy).to.include("frame-ancestors 'self'");
    expect(response.headers["x-content-type-options"]).to.equal("nosniff");
    expect(response.headers["x-powered-by"]).to.equal(undefined);
  });

  it("preserves a valid client request ID", async () => {
    const response = await request(createApp({ logger: createSilentLogger() }))
      .get("/health")
      .set("x-request-id", "request-123");

    expect(response.headers["x-request-id"]).to.equal("request-123");
  });

  it("replaces an unsafe client request ID", async () => {
    const response = await request(createApp({ logger: createSilentLogger() }))
      .get("/health")
      .set("x-request-id", "unsafe request id");

    expect(response.headers["x-request-id"]).to.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });

  it("returns a stable response for an unknown route", async () => {
    const response = await request(
      createApp({ logger: createSilentLogger() }),
    ).get("/missing");

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  it("does not expose unexpected error details", async () => {
    const app = createApp({
      logger: createSilentLogger(),
      registerRoutes(expressApp) {
        expressApp.get("/failure", () => {
          throw new Error("database-password-should-not-leak");
        });
      },
    });
    const response = await request(app).get("/failure");

    expect(response.status).to.equal(500);
    expect(response.body).to.deep.equal({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
        requestId: response.headers["x-request-id"],
      },
    });
    expect(JSON.stringify(response.body)).not.to.contain(
      "database-password-should-not-leak",
    );
  });

  it("returns a safe validation error for malformed JSON", async () => {
    const response = await request(createApp({ logger: createSilentLogger() }))
      .post("/missing")
      .set("content-type", "application/json")
      .send('{"unfinished":');

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON.",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  it("rejects oversized JSON before route handling", async () => {
    const response = await request(createApp({ logger: createSilentLogger() }))
      .post("/missing")
      .send({ content: "x".repeat(101 * 1024) });

    expect(response.status).to.equal(413);
    expect(response.body).to.deep.equal({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large.",
        requestId: response.headers["x-request-id"],
      },
    });
  });
});

describe("environment configuration", () => {
  it("provides safe development defaults", () => {
    const environment = loadEnvironment({ DATABASE_URL: TEST_DATABASE_URL });

    expect(environment).to.deep.equal({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      LOG_LEVEL: "info",
      SHUTDOWN_TIMEOUT_MS: 10_000,
      DATABASE_URL: TEST_DATABASE_URL,
    });
  });

  it("rejects invalid values without echoing them", () => {
    const invalidPort = "not-a-port-secret";
    let caughtError: unknown;

    try {
      loadEnvironment({
        DATABASE_URL: TEST_DATABASE_URL,
        PORT: invalidPort,
      });
    } catch (error: unknown) {
      caughtError = error;
    }

    expect(caughtError).to.be.instanceOf(EnvironmentValidationError);
    expect((caughtError as EnvironmentValidationError).message).not.to.contain(
      invalidPort,
    );
  });
});

describe("structured logger", () => {
  it("preserves native error details", () => {
    const chunks: string[] = [];
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    });
    const logger = createLogger({ destination });
    const error = new Error("diagnostic details");

    logger.error({ err: error }, "Failure test");

    const entry = JSON.parse(chunks.join("").trim()) as {
      readonly err?: {
        readonly message?: string;
        readonly stack?: string;
        readonly type?: string;
      };
    };

    expect(entry.err).to.include({
      message: "diagnostic details",
      type: "Error",
    });
    expect(entry.err?.stack).to.contain("Error: diagnostic details");
  });

  it("redacts credentials from structured log fields", () => {
    const chunks: string[] = [];
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    });
    const logger = createLogger({ destination });

    logger.info(
      {
        password: "top-secret",
        body: { token: "direct-body-token-value" },
        req: {
          body: {
            password: "another-secret",
            token: "request-body-token-value",
          },
          headers: {
            authorization: "Bearer secret-token",
            cookie: "session=secret-session",
          },
        },
        res: {
          headers: {
            "set-cookie": "session=secret-response-session",
          },
        },
      },
      "Sensitive fields test",
    );

    const entry = JSON.parse(chunks.join("").trim()) as Record<string, unknown>;
    const serializedEntry = JSON.stringify(entry);

    expect(entry.password).to.equal("[REDACTED]");
    expect(serializedEntry).not.to.contain("top-secret");
    expect(serializedEntry).not.to.contain("another-secret");
    expect(serializedEntry).not.to.contain("direct-body-token-value");
    expect(serializedEntry).not.to.contain("request-body-token-value");
    expect(serializedEntry).not.to.contain("secret-token");
    expect(serializedEntry).not.to.contain("secret-session");
    expect(serializedEntry).not.to.contain("secret-response-session");
  });
});
