import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

const INVALID_CONNECTION_STRING_MESSAGE =
  "A PostgreSQL connection string is required.";

/** Creates a lazily connected Prisma client for a validated PostgreSQL URL. */
export function createDatabaseClient(connectionString: string): PrismaClient {
  const normalizedConnectionString = connectionString.trim();

  let databaseUrl: URL;

  try {
    databaseUrl = new URL(normalizedConnectionString);
  } catch {
    throw new Error(INVALID_CONNECTION_STRING_MESSAGE);
  }

  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error(INVALID_CONNECTION_STRING_MESSAGE);
  }

  const adapter = new PrismaPg({
    connectionString: normalizedConnectionString,
  });

  return new PrismaClient({ adapter });
}
