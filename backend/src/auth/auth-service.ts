import { z } from "zod";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "./credentials.js";
import {
  AuthenticationValidationError,
  DuplicateEmailError,
  InvalidCredentialsError,
  RegistrationConflictError,
  type AuthenticatedUser,
  type AuthenticationRepository,
  type AuthenticationResult,
  type LoginInput,
  type RegistrationInput,
  type StoredUser,
} from "./auth-types.js";

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVALID_PASSWORD_PLACEHOLDER = "invalid-login-placeholder";
const MAX_SESSION_TOKEN_LENGTH = 128;

const registrationSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export interface AuthenticationServiceOptions {
  now?: () => Date;
  sessionTtlMs?: number;
  issueSessionToken?: () => string;
}

function toAuthenticatedUser(user: StoredUser): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function validationIssues(error: z.ZodError): readonly string[] {
  return error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join(".") : "input";
    return `${field}: ${issue.message}`;
  });
}

/** Coordinates authentication rules without depending on HTTP concerns. */
export class AuthenticationService {
  private readonly now: () => Date;
  private readonly sessionTtlMs: number;
  private readonly issueSessionToken: () => string;

  public constructor(
    private readonly repository: AuthenticationRepository,
    options: AuthenticationServiceOptions = {},
  ) {
    const sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;

    if (
      !Number.isSafeInteger(sessionTtlMs) ||
      sessionTtlMs <= 0 ||
      sessionTtlMs > MAX_SESSION_TTL_MS
    ) {
      throw new RangeError("Session TTL must be between 1 ms and 30 days.");
    }

    this.now = options.now ?? (() => new Date());
    this.sessionTtlMs = sessionTtlMs;
    this.issueSessionToken = options.issueSessionToken ?? createSessionToken;
  }

  /** Registers a normalized user and returns the initial session credential. */
  public async register(
    input: RegistrationInput,
  ): Promise<AuthenticationResult> {
    const result = registrationSchema.safeParse(input);

    if (!result.success) {
      throw new AuthenticationValidationError(validationIssues(result.error));
    }

    const passwordHash = await hashPassword(result.data.password);
    const session = this.createSessionCredential();

    try {
      const user = await this.repository.createUserWithSession({
        email: result.data.email,
        name: result.data.name,
        passwordHash,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
      });

      return {
        user: toAuthenticatedUser(user),
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw new RegistrationConflictError();
      }

      throw error;
    }
  }

  /** Authenticates credentials without revealing whether an account exists. */
  public async login(input: LoginInput): Promise<AuthenticationResult> {
    const result = loginSchema.safeParse(input);
    const passwordForWork = result.success
      ? result.data.password
      : INVALID_PASSWORD_PLACEHOLDER;
    const user = result.success
      ? await this.repository.findUserByEmail(result.data.email)
      : null;

    const passwordMatches = user
      ? await verifyPassword(user.passwordHash, passwordForWork)
      : await this.performMissingUserPasswordWork(passwordForWork);

    if (!result.success || !user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const session = this.createSessionCredential();
    await this.repository.createSession({
      userId: user.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    });

    return {
      user: toAuthenticatedUser(user),
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    };
  }

  /** Resolves an unexpired session credential to its safe user representation. */
  public async authenticateSession(
    sessionToken: string,
  ): Promise<AuthenticatedUser | null> {
    if (!this.isPlausibleSessionToken(sessionToken)) {
      return null;
    }

    const user = await this.repository.findUserByActiveSession(
      hashSessionToken(sessionToken),
      this.now(),
    );

    return user ? toAuthenticatedUser(user) : null;
  }

  /** Revokes a session credential without disclosing whether it existed. */
  public async logout(sessionToken: string): Promise<void> {
    if (!this.isPlausibleSessionToken(sessionToken)) {
      return;
    }

    await this.repository.deleteSession(hashSessionToken(sessionToken));
  }

  /** Deletes sessions that can no longer authenticate a user. */
  public deleteExpiredSessions(): Promise<number> {
    return this.repository.deleteExpiredSessions(this.now());
  }

  private createSessionCredential(): {
    sessionToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const sessionToken = this.issueSessionToken();

    if (!this.isPlausibleSessionToken(sessionToken)) {
      throw new Error("The session token generator returned an invalid value.");
    }

    return {
      sessionToken,
      tokenHash: hashSessionToken(sessionToken),
      expiresAt: new Date(this.now().getTime() + this.sessionTtlMs),
    };
  }

  private isPlausibleSessionToken(sessionToken: string): boolean {
    return (
      sessionToken.length > 0 && sessionToken.length <= MAX_SESSION_TOKEN_LENGTH
    );
  }

  private async performMissingUserPasswordWork(
    password: string,
  ): Promise<false> {
    await hashPassword(password);
    return false;
  }
}
