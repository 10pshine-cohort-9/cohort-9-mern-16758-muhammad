import { createHash, randomBytes } from "node:crypto";

import { argon2id, hash, verify } from "argon2";

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

const PASSWORD_HASH_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hashes a password with an OWASP-aligned Argon2id configuration. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, PASSWORD_HASH_OPTIONS);
}

/** Verifies a password against its encoded Argon2 hash. */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

/** Generates a 256-bit opaque session credential for the browser. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Produces the fixed-length value persisted for a session credential. */
export function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken, "utf8").digest("hex");
}
