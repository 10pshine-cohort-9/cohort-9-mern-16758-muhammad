export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface RegistrationInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticationResult {
  user: AuthenticatedUser;
  sessionToken: string;
  expiresAt: Date;
}

export interface CreateUserWithSessionInput {
  email: string;
  name: string;
  passwordHash: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthenticationRepository {
  createUserWithSession(input: CreateUserWithSessionInput): Promise<StoredUser>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findUserByActiveSession(
    tokenHash: string,
    activeAfter: Date,
  ): Promise<StoredUser | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(expiredAtOrBefore: Date): Promise<number>;
}

export class DuplicateEmailError extends Error {
  public constructor() {
    super("A user with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

export class AuthenticationValidationError extends Error {
  public readonly issues: readonly string[];

  public constructor(issues: readonly string[]) {
    super("Invalid authentication input.");
    this.name = "AuthenticationValidationError";
    this.issues = issues;
  }
}

export class RegistrationConflictError extends Error {
  public constructor() {
    super("Registration could not be completed.");
    this.name = "RegistrationConflictError";
  }
}

export class InvalidCredentialsError extends Error {
  public constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}
