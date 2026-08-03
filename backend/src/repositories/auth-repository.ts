import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import {
  DuplicateEmailError,
  type AuthenticationRepository,
  type CreateSessionInput,
  type CreateUserWithSessionInput,
  type StoredUser,
} from "../auth/auth-types.js";

const storedUserSelection = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
} as const;

function isEmailUniquenessViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    error.meta?.modelName === "User"
  );
}

/** Persists authentication users and hashed session credentials with Prisma. */
export class PrismaAuthenticationRepository implements AuthenticationRepository {
  public constructor(private readonly client: PrismaClient) {}

  public async createUserWithSession(
    input: CreateUserWithSessionInput,
  ): Promise<StoredUser> {
    try {
      return await this.client.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash: input.passwordHash,
          },
          select: storedUserSelection,
        });

        await transaction.session.create({
          data: {
            tokenHash: input.tokenHash,
            userId: user.id,
            expiresAt: input.expiresAt,
          },
        });

        return user;
      });
    } catch (error) {
      if (isEmailUniquenessViolation(error)) {
        throw new DuplicateEmailError();
      }

      throw error;
    }
  }

  public async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.client.user.findUnique({
      where: { email },
      select: storedUserSelection,
    });
  }

  public async createSession(input: CreateSessionInput): Promise<void> {
    await this.client.session.create({ data: input });
  }

  public async findUserByActiveSession(
    tokenHash: string,
    activeAfter: Date,
  ): Promise<StoredUser | null> {
    const session = await this.client.session.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: activeAfter },
      },
      select: {
        user: { select: storedUserSelection },
      },
    });

    return session?.user ?? null;
  }

  public async deleteSession(tokenHash: string): Promise<void> {
    await this.client.session.deleteMany({ where: { tokenHash } });
  }

  public async deleteExpiredSessions(expiredAtOrBefore: Date): Promise<number> {
    const result = await this.client.session.deleteMany({
      where: { expiresAt: { lte: expiredAtOrBefore } },
    });

    return result.count;
  }
}
