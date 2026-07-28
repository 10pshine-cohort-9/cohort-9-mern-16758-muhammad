# Shine Notes

A full-stack notes application for the 10Pearls Shine MERN internship. The
current implementation contains the Node.js/TypeScript backend foundation,
PostgreSQL persistence, and the authentication domain layer.

## Prerequisites

- Node.js 22.16.0 or newer within the Node 22 release line
- npm 10.9.2 or newer
- Docker Desktop with Docker Compose

## Backend and database setup

1. Install dependencies with `npm install`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Copy `backend/.env.test.example` to `backend/.env.test`.
4. Start both databases with
   `docker compose --profile test up -d postgres postgres_test`.
5. Apply development migrations with `npm run db:migrate:deploy`.
6. Apply test migrations with
   `npm run db:test:migrate --workspace @shine-notes/backend`.
7. Generate the Prisma Client with `npm run db:generate`.
8. Run the quality gate with `npm run check`.
9. Start the API with `npm run dev:backend`.

The health endpoint is available at `http://127.0.0.1:3000/health`.

## Database commands

| Command                                                    | Purpose                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `npm run db:migrate:dev`                                   | Create and apply a migration during schema development        |
| `npm run db:migrate:deploy`                                | Apply committed migrations without changing migration history |
| `npm run db:migrate:status`                                | Compare the database with committed migration history         |
| `npm run db:generate`                                      | Generate the type-safe Prisma Client                          |
| `npm run db:studio`                                        | Open Prisma Studio for local inspection                       |
| `npm run db:test:migrate --workspace @shine-notes/backend` | Apply migrations to the guarded test database                 |
| `npm run db:test:status --workspace @shine-notes/backend`  | Inspect guarded test migration status                         |

Authentication integration tests use only `TEST_DATABASE_URL`. Their cleanup
guard refuses to run unless the database name ends in `_test`.

Local credentials in the committed environment templates are development-only.
Real credentials and `.env` files must never be committed.
