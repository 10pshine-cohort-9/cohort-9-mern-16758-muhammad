import { expect } from "chai";
import { describe, it } from "mocha";

import { createDatabaseClient } from "../src/lib/database.js";

describe("database client factory", () => {
  it("rejects a missing PostgreSQL connection string", () => {
    expect(() => createDatabaseClient("   ")).to.throw(
      "A PostgreSQL connection string is required.",
    );
  });

  it("creates a lazily connected Prisma client", async () => {
    const client = createDatabaseClient(
      "postgresql://shine_notes:shine_notes_local@localhost:5432/shine_notes",
    );

    expect(client).to.respondTo("$connect");
    await client.$disconnect();
  });
});
