import { config } from "dotenv";

import { createDatabaseClient } from "../../src/lib/database.js";

config({ path: ".env.test", quiet: true });

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Validates that destructive cleanup targets a loopback test database. */
export function validateTestDatabaseUrl(connectionString: string): void {
  const databaseUrl = new URL(connectionString);
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Refusing destructive test cleanup outside a database ending in _test.",
    );
  }

  if (!LOOPBACK_HOSTNAMES.has(databaseUrl.hostname.toLowerCase())) {
    throw new Error(
      "Refusing destructive test cleanup on a non-loopback database host.",
    );
  }
}

function loadTestDatabaseUrl(): string {
  const connectionString = process.env.TEST_DATABASE_URL?.trim();

  if (process.env.NODE_ENV !== "test" || !connectionString) {
    throw new Error(
      "Authentication database tests require NODE_ENV=test and TEST_DATABASE_URL.",
    );
  }

  validateTestDatabaseUrl(connectionString);

  return connectionString;
}

export const testDatabase = createDatabaseClient(loadTestDatabaseUrl());

/** Opens the guarded authentication integration-test database connection. */
export async function connectTestDatabase(): Promise<void> {
  await testDatabase.$connect();
}

/** Removes test-owned rows in foreign-key-safe order. */
export async function resetTestDatabase(): Promise<void> {
  await testDatabase.$transaction([
    testDatabase.session.deleteMany(),
    testDatabase.note.deleteMany(),
    testDatabase.user.deleteMany(),
  ]);
}

/** Closes the authentication integration-test database connection. */
export async function disconnectTestDatabase(): Promise<void> {
  await testDatabase.$disconnect();
}
