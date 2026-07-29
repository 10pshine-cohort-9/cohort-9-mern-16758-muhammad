# Shine Notes

A full-stack notes application for the 10Pearls Shine MERN internship. The
current implementation contains the Node.js/TypeScript backend foundation and
the PostgreSQL schema foundation.

## Prerequisites

- Node.js 22.16.0 or newer within the Node 22 release line
- npm 10.9.2 or newer
- Docker Desktop with Docker Compose

## Backend and database setup

1. Install dependencies with `npm install`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Start PostgreSQL with `docker compose up -d postgres`.
4. Apply committed migrations with `npm run db:migrate:deploy`.
5. Generate the Prisma Client with `npm run db:generate`.
6. Run the quality gate with `npm run check`.
7. Start the API with `npm run dev:backend`.

The health endpoint is available at `http://127.0.0.1:3000/health`.

## Database commands

| Command                     | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `npm run db:migrate:dev`    | Create and apply a migration during schema development        |
| `npm run db:migrate:deploy` | Apply committed migrations without changing migration history |
| `npm run db:migrate:status` | Compare the database with committed migration history         |
| `npm run db:generate`       | Generate the type-safe Prisma Client                          |
| `npm run db:studio`         | Open Prisma Studio for local inspection                       |

Local credentials in `backend/.env.example` are development-only. Real
credentials and `.env` files must never be committed.
