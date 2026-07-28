import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.test", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("TEST_DATABASE_URL"),
  },
});
