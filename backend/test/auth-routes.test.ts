import { expect } from "chai";
import type { Express } from "express";
import { describe, it } from "mocha";
import type { Logger } from "pino";
import request from "supertest";

import {
  AuthenticationValidationError,
  InvalidCredentialsError,
  type AuthenticationResult,
} from "../src/auth/auth-types.js";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/lib/logger.js";
import {
  createAuthRouter,
  type AuthRouteService,
} from "../src/routes/auth-routes.js";

const authenticationResult: AuthenticationResult = {
  user: {
    id: "2f1d4ae9-2f9a-4219-b03b-cf62eb7dfb18",
    email: "umer@example.com",
    name: "Umer",
  },
  sessionToken: "test-session-token",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
};

function createSilentLogger(): Logger {
  return createLogger({ level: "silent" });
}

function createTestService(): AuthRouteService {
  return {
    register: () => Promise.resolve(authenticationResult),
    login: () => Promise.resolve(authenticationResult),
    authenticateSession: () => Promise.resolve(authenticationResult.user),
    logout: () => Promise.resolve(),
  };
}

function createTestApp(authenticationService: AuthRouteService): Express {
  return createApp({
    logger: createSilentLogger(),
    registerRoutes(app) {
      app.use("/api/auth", createAuthRouter(authenticationService));
    },
  });
}

describe("authentication routes", () => {
  it("registers a user and sets the session cookie", async () => {
    const response = await request(createTestApp(createTestService()))
      .post("/api/auth/register")
      .send({
        name: "Umer",
        email: "umer@example.com",
        password: "correct-password",
      });

    expect(response.status).to.equal(201);
    expect(response.body).to.deep.equal({ user: authenticationResult.user });
    expect(JSON.stringify(response.body)).not.to.contain("test-session-token");
    expect(response.headers["cache-control"]).to.equal("no-store");

    const cookies = response.headers["set-cookie"] as unknown as string[];
    expect(cookies[0]).to.include("shine_session=test-session-token");
    expect(cookies[0]).to.include("HttpOnly");
    expect(cookies[0]).to.include("SameSite=Lax");
  });

  it("returns a validation error for invalid registration details", async () => {
    const service = createTestService();
    service.register = () =>
      Promise.reject(
        new AuthenticationValidationError(["email: Invalid email"]),
      );
    const response = await request(createTestApp(service))
      .post("/api/auth/register")
      .send({});

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: {
        code: "INVALID_AUTH_INPUT",
        message: "Invalid authentication input.",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  it("logs in a user and sets the session cookie", async () => {
    const response = await request(createTestApp(createTestService()))
      .post("/api/auth/login")
      .send({ email: "umer@example.com", password: "correct-password" });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ user: authenticationResult.user });
    expect(response.headers["set-cookie"]).not.to.equal(undefined);
  });

  it("returns a generic error for invalid login credentials", async () => {
    const service = createTestService();
    service.login = () => Promise.reject(new InvalidCredentialsError());
    const response = await request(createTestApp(service))
      .post("/api/auth/login")
      .send({ email: "umer@example.com", password: "wrong-password" });

    expect(response.status).to.equal(401);
    expect(response.body).to.deep.equal({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  it("checks the session cookie before returning the user", async () => {
    const app = createTestApp(createTestService());
    const validCookieResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "shine_session=test-session-token");
    const missingCookieResponse = await request(app).get("/api/auth/me");

    expect(validCookieResponse.status).to.equal(200);
    expect(validCookieResponse.body).to.deep.equal({
      user: authenticationResult.user,
    });
    expect(missingCookieResponse.status).to.equal(401);
    expect(missingCookieResponse.body).to.deep.equal({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Please log in.",
        requestId: missingCookieResponse.headers["x-request-id"],
      },
    });
  });

  it("logs out the current session and clears the cookie", async () => {
    const service = createTestService();
    let loggedOutToken = "";
    service.logout = (sessionToken) => {
      loggedOutToken = sessionToken;
      return Promise.resolve();
    };

    const response = await request(createTestApp(service))
      .post("/api/auth/logout")
      .set("Cookie", "shine_session=test-session-token");

    expect(response.status).to.equal(204);
    expect(loggedOutToken).to.equal("test-session-token");

    const cookies = response.headers["set-cookie"] as unknown as string[];
    expect(cookies[0]).to.include("shine_session=");
    expect(cookies[0]).to.include("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});
