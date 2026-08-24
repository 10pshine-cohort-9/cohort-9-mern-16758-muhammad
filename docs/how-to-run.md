# How to run Shine Notes

## Requirements

- Node.js 22.16.0 or newer within the Node 22 release line
- npm 10.9.2 or newer
- Docker Desktop with Docker Compose, running before setup begins

## Setup

1. Install the dependencies from the repository root:

   ```bash
   npm ci
   ```

2. Create the local environment files:

   - Copy `backend/.env.example` to `backend/.env`.
   - Copy `backend/.env.test.example` to `backend/.env.test`.

   The example database credentials already match `compose.yaml` and are only
   intended for local development.

3. Start the development and test PostgreSQL containers:

   ```bash
   docker compose --profile test up -d --wait postgres postgres_test
   ```

4. Apply the database migrations and generate Prisma Client:

   ```bash
   npm run db:migrate:deploy
   npm run db:test:migrate --workspace @shine-notes/backend
   npm run db:generate
   ```

## Start the application

Run the backend and frontend in separate terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Open `http://localhost:5173`. The backend health endpoint is available at
`http://127.0.0.1:3000/health`.

New account passwords must contain at least 15 characters.

## Run the quality checks

```bash
npm run check
```

This checks formatting, the Prisma schema, linting, TypeScript, test coverage,
and production builds.

To check only the packages required by the running application for known npm
vulnerabilities, run:

```bash
npm audit --omit=dev
```

To inspect the development database with Prisma Studio, run:

```bash
npm run db:studio
```

## Stop the local services

```bash
docker compose --profile test down
```

This stops the containers but preserves development data. Adding `-v` would
also delete the PostgreSQL development volume.
