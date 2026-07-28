import { expect } from "chai";
import { after, before, beforeEach, describe, it } from "mocha";

import { AuthenticationService } from "../src/auth/auth-service.js";
import {
  AuthenticationValidationError,
  DuplicateEmailError,
  InvalidCredentialsError,
  RegistrationConflictError,
} from "../src/auth/auth-types.js";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "../src/auth/credentials.js";
import { PrismaAuthenticationRepository } from "../src/repositories/auth-repository.js";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
  testDatabase,
} from "./support/database.js";

const VALID_PASSWORD = "correct horse battery staple";
const FIXED_NOW = new Date("2026-07-28T12:00:00.000Z");
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function rejectionOf(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation;
  } catch (error) {
    return error;
  }

  throw new Error("Expected the operation to reject.");
}

describe("authentication domain and persistence", () => {
  let repository: PrismaAuthenticationRepository;
  let tokenSequence: number;

  before(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    repository = new PrismaAuthenticationRepository(testDatabase);
    tokenSequence = 0;
  });

  after(async () => {
    await resetTestDatabase();
    await disconnectTestDatabase();
  });

  function createService(
    now: () => Date = () => FIXED_NOW,
    sessionTtlMs: number = DEFAULT_SESSION_TTL_MS,
  ): AuthenticationService {
    return new AuthenticationService(repository, {
      now,
      sessionTtlMs,
      issueSessionToken: () => `test-session-token-${String(++tokenSequence)}`,
    });
  }

  describe("credential primitives", () => {
    it("hashes passwords with salted Argon2id parameters", async () => {
      const firstHash = await hashPassword(VALID_PASSWORD);
      const secondHash = await hashPassword(VALID_PASSWORD);

      expect(firstHash).to.include("$argon2id$v=19$");
      expect(firstHash).to.include("m=19456");
      expect(firstHash).to.include("t=2");
      expect(firstHash).to.include("p=1");
      expect(firstHash).not.to.equal(secondHash);
      expect(await verifyPassword(firstHash, VALID_PASSWORD)).to.equal(true);
      expect(await verifyPassword(firstHash, "incorrect password")).to.equal(
        false,
      );
    });

    it("issues opaque session tokens and stable storage hashes", () => {
      const firstToken = createSessionToken();
      const secondToken = createSessionToken();
      const tokenHash = hashSessionToken(firstToken);

      expect(firstToken).to.match(/^[\w-]{43}$/u);
      expect(firstToken).not.to.equal(secondToken);
      expect(tokenHash).to.match(/^[a-f\d]{64}$/u);
      expect(tokenHash).not.to.equal(firstToken);
      expect(hashSessionToken(firstToken)).to.equal(tokenHash);
    });
  });

  describe("Prisma authentication repository", () => {
    it("creates a user and initial hashed session transactionally", async () => {
      const tokenHash = hashSessionToken("registration-token");
      const expiresAt = new Date(FIXED_NOW.getTime() + 60_000);

      const user = await repository.createUserWithSession({
        email: "engineer@example.com",
        name: "Engineer",
        passwordHash: "encoded-password-hash",
        tokenHash,
        expiresAt,
      });

      const session = await testDatabase.session.findUnique({
        where: { tokenHash },
      });

      expect(user.email).to.equal("engineer@example.com");
      expect(session).to.include({ userId: user.id, tokenHash });
      expect(session?.expiresAt).to.deep.equal(expiresAt);
    });

    it("maps duplicate emails without hiding other transaction failures", async () => {
      const sharedTokenHash = hashSessionToken("shared-token");

      await repository.createUserWithSession({
        email: "existing@example.com",
        name: "Existing",
        passwordHash: "encoded-password-hash",
        tokenHash: sharedTokenHash,
        expiresAt: new Date(FIXED_NOW.getTime() + 60_000),
      });

      const duplicateEmailError = await rejectionOf(
        repository.createUserWithSession({
          email: "existing@example.com",
          name: "Duplicate",
          passwordHash: "another-password-hash",
          tokenHash: hashSessionToken("different-token"),
          expiresAt: new Date(FIXED_NOW.getTime() + 60_000),
        }),
      );

      expect(duplicateEmailError).to.be.instanceOf(DuplicateEmailError);

      const tokenCollisionError = await rejectionOf(
        repository.createUserWithSession({
          email: "rolled-back@example.com",
          name: "Rolled Back",
          passwordHash: "another-password-hash",
          tokenHash: sharedTokenHash,
          expiresAt: new Date(FIXED_NOW.getTime() + 60_000),
        }),
      );

      expect(tokenCollisionError).not.to.be.instanceOf(DuplicateEmailError);
      expect(
        await repository.findUserByEmail("rolled-back@example.com"),
      ).to.equal(null);
    });

    it("finds only active sessions and removes expired sessions", async () => {
      const user = await repository.createUserWithSession({
        email: "sessions@example.com",
        name: "Sessions",
        passwordHash: "encoded-password-hash",
        tokenHash: hashSessionToken("expired-token"),
        expiresAt: new Date(FIXED_NOW.getTime() - 1),
      });
      const activeTokenHash = hashSessionToken("active-token");

      await repository.createSession({
        userId: user.id,
        tokenHash: activeTokenHash,
        expiresAt: new Date(FIXED_NOW.getTime() + 60_000),
      });

      expect(
        await repository.findUserByActiveSession(
          hashSessionToken("expired-token"),
          FIXED_NOW,
        ),
      ).to.equal(null);
      expect(
        await repository.findUserByActiveSession(activeTokenHash, FIXED_NOW),
      ).to.include({ id: user.id });
      expect(await repository.deleteExpiredSessions(FIXED_NOW)).to.equal(1);
      expect(await testDatabase.session.count()).to.equal(1);
    });
  });

  describe("authentication service", () => {
    it("rejects unsafe configuration and malformed login input", async () => {
      expect(() => createService(() => FIXED_NOW, 0)).to.throw(
        "Session TTL must be between 1 ms and 30 days.",
      );

      const malformedLogin = await rejectionOf(
        createService().login({
          email: "not-an-email",
          password: "x".repeat(129),
        }),
      );

      expect(malformedLogin).to.be.instanceOf(InvalidCredentialsError);
      expect(await testDatabase.user.count()).to.equal(0);
      expect(await testDatabase.session.count()).to.equal(0);
    });

    it("registers normalized users without exposing credential hashes", async () => {
      const service = createService();

      const result = await service.register({
        email: "  Engineer@Example.COM ",
        name: "  Example Engineer  ",
        password: VALID_PASSWORD,
      });
      const storedUser = await repository.findUserByEmail(
        "engineer@example.com",
      );
      const storedSession = await testDatabase.session.findUnique({
        where: { tokenHash: hashSessionToken(result.sessionToken) },
      });

      expect(result.user).to.deep.equal({
        id: storedUser?.id,
        email: "engineer@example.com",
        name: "Example Engineer",
      });
      expect(result.user).not.to.have.property("passwordHash");
      expect(storedUser?.passwordHash).not.to.equal(VALID_PASSWORD);
      expect(
        await verifyPassword(storedUser?.passwordHash ?? "", VALID_PASSWORD),
      ).to.equal(true);
      expect(storedSession?.tokenHash).not.to.equal(result.sessionToken);
      expect(result.expiresAt).to.deep.equal(
        new Date(FIXED_NOW.getTime() + DEFAULT_SESSION_TTL_MS),
      );
    });

    it("enforces registration rules and returns a generic conflict", async () => {
      const service = createService();
      const invalidInputError = await rejectionOf(
        service.register({
          email: "engineer@example.com",
          name: "Engineer",
          password: "too short",
        }),
      );

      expect(invalidInputError).to.be.instanceOf(AuthenticationValidationError);
      expect(await testDatabase.user.count()).to.equal(0);

      await service.register({
        email: "engineer@example.com",
        name: "Engineer",
        password: VALID_PASSWORD,
      });

      const conflict = await rejectionOf(
        service.register({
          email: "  ENGINEER@example.com ",
          name: "Another Engineer",
          password: VALID_PASSWORD,
        }),
      );

      expect(conflict).to.be.instanceOf(RegistrationConflictError);
      expect((conflict as Error).message).not.to.include(
        "engineer@example.com",
      );
    });

    it("logs in valid users and keeps credential failures generic", async () => {
      const service = createService();
      await service.register({
        email: "engineer@example.com",
        name: "Engineer",
        password: VALID_PASSWORD,
      });

      const login = await service.login({
        email: " ENGINEER@example.com ",
        password: VALID_PASSWORD,
      });
      const wrongPassword = await rejectionOf(
        service.login({
          email: "engineer@example.com",
          password: "incorrect password value",
        }),
      );
      const missingUser = await rejectionOf(
        service.login({
          email: "missing@example.com",
          password: "incorrect password value",
        }),
      );

      expect(login.user.email).to.equal("engineer@example.com");
      expect(await testDatabase.session.count()).to.equal(2);
      expect(wrongPassword).to.be.instanceOf(InvalidCredentialsError);
      expect(missingUser).to.be.instanceOf(InvalidCredentialsError);
      expect((wrongPassword as Error).message).to.equal(
        (missingUser as Error).message,
      );
    });

    it("expires, cleans up, and revokes session credentials", async () => {
      let currentTime = FIXED_NOW;
      const service = createService(() => currentTime, 1000);

      expect(await service.authenticateSession("")).to.equal(null);
      await service.logout("");

      const registration = await service.register({
        email: "engineer@example.com",
        name: "Engineer",
        password: VALID_PASSWORD,
      });

      expect(
        await service.authenticateSession(registration.sessionToken),
      ).to.deep.equal(registration.user);

      currentTime = new Date(FIXED_NOW.getTime() + 1001);

      expect(
        await service.authenticateSession(registration.sessionToken),
      ).to.equal(null);
      expect(await service.deleteExpiredSessions()).to.equal(1);

      const login = await service.login({
        email: "engineer@example.com",
        password: VALID_PASSWORD,
      });

      await service.logout(login.sessionToken);
      await service.logout(login.sessionToken);

      expect(await service.authenticateSession(login.sessionToken)).to.equal(
        null,
      );
    });
  });
});
