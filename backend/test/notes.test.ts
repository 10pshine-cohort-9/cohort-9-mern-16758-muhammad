import { expect } from "chai";
import type { Express } from "express";
import { after, before, beforeEach, describe, it } from "mocha";
import request from "supertest";

import { createApp } from "../src/app.js";
import { AuthenticationService } from "../src/auth/auth-service.js";
import { hashSessionToken } from "../src/auth/credentials.js";
import { createLogger } from "../src/lib/logger.js";
import { parseNoteContent } from "../src/notes/note-content.js";
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
    content: unknown;
    plainText: string;
    version: number;
  };
}

interface NotesResponse {
  notes: {
    id: string;
    title: string;
    content: unknown;
  }[];
}

interface ErrorResponse {
  error: {
    message: string;
  };
}

function richText(text: string): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}

function deeplyNestedRichText(): Record<string, unknown> {
  let node: Record<string, unknown> = {
    type: "paragraph",
    content: [{ type: "text", text: "Too deep" }],
  };

  for (let index = 0; index < 12; index += 1) {
    node = {
      type: "bulletList",
      content: [{ type: "listItem", content: [node] }],
    };
  }

  return { type: "doc", content: [node] };
}

function oversizedRichTextDocument(): Record<string, unknown> {
  return {
    type: "doc",
    content: Array.from({ length: 900 }, () => ({
      type: "paragraph",
      content: [{ type: "text", text: "x".repeat(45) }],
    })),
  };
}

it("rejects unsafe rich text documents", () => {
  expect(
    parseNoteContent({
      type: "doc",
      content: [{ type: "codeBlock" }],
    }),
  ).to.equal(null);
  expect(
    parseNoteContent({
      type: "doc",
      content: [{ type: "paragraph", content: "not-an-array" }],
    }),
  ).to.equal(null);
  expect(parseNoteContent(deeplyNestedRichText())).to.equal(null);
});

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
        content: richText("Prepare notes for the meeting."),
      });
    const created = createResponse.body as NoteResponse;

    expect(createResponse.status).to.equal(201);
    expect(created.note.title).to.equal("Project ideas");
    expect(created.note.content).to.deep.equal(
      richText("Prepare notes for the meeting."),
    );
    expect(created.note.plainText).to.equal("Prepare notes for the meeting.");

    await request(app)
      .post("/api/notes")
      .set("Cookie", cookie)
      .send({
        title: "Shopping list",
        content: richText("Milk and bread"),
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

    const titleOnlyResponse = await request(app)
      .get("/api/notes?search=meeting&searchIn=title")
      .set("Cookie", cookie);
    expect((titleOnlyResponse.body as NotesResponse).notes).to.have.length(0);

    const contentOnlyResponse = await request(app)
      .get("/api/notes?search=meeting&searchIn=content")
      .set("Cookie", cookie);
    expect((contentOnlyResponse.body as NotesResponse).notes).to.have.length(1);

    const sortedResponse = await request(app)
      .get("/api/notes?sort=title-asc")
      .set("Cookie", cookie);
    const sorted = sortedResponse.body as NotesResponse;
    expect(sorted.notes.map((note) => note.title)).to.deep.equal([
      "Project ideas",
      "Shopping list",
    ]);

    const getResponse = await request(app)
      .get(`/api/notes/${created.note.id}`)
      .set("Cookie", cookie);
    expect(getResponse.status).to.equal(200);

    const updateResponse = await request(app)
      .put(`/api/notes/${created.note.id}`)
      .set("Cookie", cookie)
      .send({
        title: "Updated ideas",
        content: richText("Updated content"),
      });
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
      .send({ title: "Private note", content: richText("Only for the owner") });
    const created = createResponse.body as NoteResponse;

    const getResponse = await request(app)
      .get(`/api/notes/${created.note.id}`)
      .set("Cookie", `shine_session=${secondSession}`);
    const updateResponse = await request(app)
      .put(`/api/notes/${created.note.id}`)
      .set("Cookie", `shine_session=${secondSession}`)
      .send({ title: "Changed", content: richText("Changed") });
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
      .send({ content: richText("Content without a title") });
    const invalidContent = await request(app)
      .post("/api/notes")
      .set("Cookie", cookie)
      .send({ title: "Invalid content", content: "Plain text" });
    const longPlainText = await request(app)
      .post("/api/notes")
      .set("Cookie", cookie)
      .send({ title: "Long content", content: richText("x".repeat(50_001)) });
    const largeDocument = await request(app)
      .post("/api/notes")
      .set("Cookie", cookie)
      .send({
        title: "Large document",
        content: oversizedRichTextDocument(),
      });
    const invalidId = await request(app)
      .get("/api/notes/not-a-uuid")
      .set("Cookie", cookie);
    const longSearch = await request(app)
      .get(`/api/notes?search=${"a".repeat(201)}`)
      .set("Cookie", cookie);
    const invalidSearchField = await request(app)
      .get("/api/notes?searchIn=invalid")
      .set("Cookie", cookie);
    const invalidSort = await request(app)
      .get("/api/notes?sort=invalid")
      .set("Cookie", cookie);

    expect(missingTitle.status).to.equal(400);
    expect(invalidContent.status).to.equal(400);
    expect(longPlainText.status).to.equal(400);
    expect(largeDocument.status).to.equal(400);
    expect((longPlainText.body as ErrorResponse).error.message).to.equal(
      "Content must not exceed 50000 characters.",
    );
    expect((largeDocument.body as ErrorResponse).error.message).to.equal(
      "Content document must not exceed 90000 characters.",
    );
    expect(invalidId.status).to.equal(400);
    expect(longSearch.status).to.equal(400);
    expect(invalidSearchField.status).to.equal(400);
    expect(invalidSort.status).to.equal(400);
  });
});
