import { Router, type Request, type Response } from "express";

import {
  AuthenticationValidationError,
  InvalidCredentialsError,
  RegistrationConflictError,
  type AuthenticatedUser,
  type AuthenticationResult,
  type LoginInput,
  type RegistrationInput,
} from "../auth/auth-types.js";
import { HttpError } from "../middleware/error-handler.js";

const SESSION_COOKIE_NAME = "shine_session";

export interface AuthRouteService {
  register(input: RegistrationInput): Promise<AuthenticationResult>;
  login(input: LoginInput): Promise<AuthenticationResult>;
  authenticateSession(sessionToken: string): Promise<AuthenticatedUser | null>;
  logout(sessionToken: string): Promise<void>;
}

export function getSessionToken(request: Request): string | null {
  const sessionToken: unknown = request.cookies[SESSION_COOKIE_NAME];

  if (typeof sessionToken === "string") {
    return sessionToken;
  }

  return null;
}

function setSessionCookie(
  response: Response,
  result: AuthenticationResult,
  secureCookies: boolean,
): void {
  response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
    expires: result.expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: secureCookies,
  });
}

/** Creates the HTTP routes for browser authentication sessions. */
export function createAuthRouter(
  authService: AuthRouteService,
  secureCookies = false,
): Router {
  const router = Router();

  router.post("/register", async (request, response, next) => {
    try {
      const result = await authService.register(
        request.body as RegistrationInput,
      );

      setSessionCookie(response, result, secureCookies);
      response.setHeader("cache-control", "no-store");
      response.status(201).json({ user: result.user });
    } catch (error: unknown) {
      if (error instanceof AuthenticationValidationError) {
        next(new HttpError(400, "INVALID_AUTH_INPUT", error.message));
        return;
      }

      if (error instanceof RegistrationConflictError) {
        next(new HttpError(409, "REGISTRATION_CONFLICT", error.message));
        return;
      }

      next(error);
    }
  });

  router.post("/login", async (request, response, next) => {
    try {
      const result = await authService.login(request.body as LoginInput);

      setSessionCookie(response, result, secureCookies);
      response.setHeader("cache-control", "no-store");
      response.status(200).json({ user: result.user });
    } catch (error: unknown) {
      if (error instanceof InvalidCredentialsError) {
        next(new HttpError(401, "INVALID_CREDENTIALS", error.message));
        return;
      }

      next(error);
    }
  });

  router.get("/me", async (request, response, next) => {
    try {
      const sessionToken = getSessionToken(request);
      const user = sessionToken
        ? await authService.authenticateSession(sessionToken)
        : null;

      if (!user) {
        next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Please log in."));
        return;
      }

      response.setHeader("cache-control", "no-store");
      response.status(200).json({ user });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.post("/logout", async (request, response, next) => {
    try {
      const sessionToken = getSessionToken(request);

      if (sessionToken) {
        await authService.logout(sessionToken);
      }

      response.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: secureCookies,
      });
      response.setHeader("cache-control", "no-store");
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  });

  return router;
}
