import { expect } from "chai";
import type { Express } from "express";
import { after, before, beforeEach, describe, it } from "mocha";
import request from "supertest";

import { createApp } from "../src/app.js";
import { AuthenticationService } from "../src/auth/auth-service.js";
import { hashSessionToken } from "../src/auth/credentials.js";
import { createLogger } from "../src/lib/logger.js";
import { NoteService } from "../src/notes/note-service.js";
import { PrismaAuthenticationRepository } from "../src/repositories/auth-repository.js";
import { NoteRepository } from "../src/repositories/note-repository.js";
import { createNoteRouter } from "../src/routes/note-routes.js";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
  testDatabase,
} from "./support/database.js";

interface NoteResponse {
  note: {
    id: string;
    title: string;
    content: string;
    version: number;
  };
}

interface NotesResponse {
  notes: {
    id: string;
    title: string;
    content: string;
  }[];
}

function createTestApp(): Express {
  const authenticationRepository = new PrismaAuthenticationRepository(
    testDatabase,
  );
  const authenticationService = new AuthenticationService(
    authenticationRepository,
  );
  const noteRepository = new NoteRepository(testDatabase);
  const noteService = new NoteService(noteRepository);

  return createApp({
    logger: createLogger({ level: "silent" }),
    registerRoutes(app) {
      app.use(
        "/api/notes",
        createNoteRouter(authenticationService, noteService),
      );
    },
  });
}

async function createUserSession(
  email: string,
  sessionToken: string,
): Promise<string> {
  const user = await testDatabase.user.create({
    data: {
      email,
      name: "Test User",
      passwordHash: "test-password-hash",
    },
  });

  await testDatabase.session.create({
    data: {
      tokenHash: hashSessionToken(sessionToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  return user.id;
}

describe("notes API", () => {
  before(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  after(async () => {
    await resetTestDatabase();
    await disconnectTestDatabase();
  });

  it("requires a valid session", async () => {
    const response = await request(createTestApp()).get("/api/notes");

    expect(response.status).to.equal(401);
    expect(response.body).to.deep.equal({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Please log in.",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  it("creates, searches, updates, and deletes notes", async () => {
    const app = createTestApp();
    const sessionToken = "first-user-session";
    await createUserSession("first@example.com", sessionToken);
    const cookie = `shine_session=${sessionToken}`;

    const createResponse = await request(app)
      .post("/api/notes")
      .set("Cookie", cookie)
      .send({
        title: "  Project ideas  ",
        content: "Prepare notes for the meeting.",
      });
    const created = createResponse.body as NoteResponse;

    expect(createResponse.status).to.equal(201);
    expect(created.note.title).to.equal("Project ideas");
    expect(created.note.content).to.equal("Prepare notes for the meeting.");

    await request(app).post("/api/notes").set("Cookie", cookie).send({
      title: "Shopping list",
      content: "Milk and bread",
    });

    const listResponse = await request(app)
      .get("/api/notes")
      .set("Cookie", cookie);
    const listed = listResponse.body as NotesResponse;
    expect(listResponse.status).to.equal(200);
    expect(listed.notes).to.have.length(2);

    const searchResponse = await request(app)
      .get("/api/notes?search=meeting")
      .set("Cookie", cookie);
    const searched = searchResponse.body as NotesResponse;
    expect(searched.notes).to.have.length(1);
    expect(searched.notes[0]?.id).to.equal(created.note.id);

    const getResponse = await request(app)
      .get(`/api/notes/${created.note.id}`)
      .set("Cookie", cookie);
    expect(getResponse.status).to.equal(200);

    const updateResponse = await request(app)
      .put(`/api/notes/${created.note.id}`)
      .set("Cookie", cookie)
      .send({ title: "Updated ideas", content: "Updated content" });
    const updated = updateResponse.body as NoteResponse;
    expect(updateResponse.status).to.equal(200);
    expect(updated.note.title).to.equal("Updated ideas");
    expect(updated.note.version).to.equal(2);

    const deleteResponse = await request(app)
      .delete(`/api/notes/${created.note.id}`)
      .set("Cookie", cookie);
    expect(deleteResponse.status).to.equal(204);

    const missingResponse = await request(app)
      .get(`/api/notes/${created.note.id}`)
      .set("Cookie", cookie);
    expect(missingResponse.status).to.equal(404);
  });

  it("keeps notes private to their owner", async () => {
    const app = createTestApp();
    const firstSession = "first-owner-session";
    const secondSession = "second-owner-session";
    await createUserSession("owner@example.com", firstSession);
    await createUserSession("other@example.com", secondSession);

    const createResponse = await request(app)
      .post("/api/notes")
      .set("Cookie", `shine_session=${firstSession}`)
      .send({ title: "Private note", content: "Only for the owner" });
    const created = createResponse.body as NoteResponse;

    const getResponse = await request(app)
      .get(`/api/notes/${created.note.id}`)
      .set("Cookie", `shine_session=${secondSession}`);
    const updateResponse = await request(app)
      .put(`/api/notes/${created.note.id}`)
      .set("Cookie", `shine_session=${secondSession}`)
      .send({ title: "Changed", content: "Changed" });
    const deleteResponse = await request(app)
      .delete(`/api/notes/${created.note.id}`)
      .set("Cookie", `shine_session=${secondSession}`);
    const listResponse = await request(app)
      .get("/api/notes")
      .set("Cookie", `shine_session=${secondSession}`);
    const listed = listResponse.body as NotesResponse;

    expect(getResponse.status).to.equal(404);
    expect(updateResponse.status).to.equal(404);
    expect(deleteResponse.status).to.equal(404);
    expect(listed.notes).to.deep.equal([]);
  });

  it("rejects invalid note input", async () => {
    const app = createTestApp();
    const sessionToken = "validation-session";
    await createUserSession("validation@example.com", sessionToken);
    const cookie = `shine_session=${sessionToken}`;

    const missingTitle = await request(app)
      .post("/api/notes")
      .set("Cookie", cookie)
      .send({ content: "Content without a title" });
    const invalidId = await request(app)
      .get("/api/notes/not-a-uuid")
      .set("Cookie", cookie);
    const longSearch = await request(app)
      .get(`/api/notes?search=${"a".repeat(201)}`)
      .set("Cookie", cookie);

    expect(missingTitle.status).to.equal(400);
    expect(invalidId.status).to.equal(400);
    expect(longSearch.status).to.equal(400);
  });
});
