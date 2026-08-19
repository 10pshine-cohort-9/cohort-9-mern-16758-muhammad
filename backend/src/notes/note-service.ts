import type { Note } from "../generated/prisma/client.js";
import { HttpError } from "../middleware/error-handler.js";
import type {
  NoteRepository,
  NoteSearchField,
  NoteSort,
} from "../repositories/note-repository.js";
import { parseNoteContent, type JsonObject } from "./note-content.js";

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50_000;
const MAX_DOCUMENT_LENGTH = 90_000;
const MAX_SEARCH_LENGTH = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function invalidNoteInput(message: string): HttpError {
  return new HttpError(400, "INVALID_NOTE_INPUT", message);
}

function readNoteInput(input: unknown): {
  title: string;
  content: JsonObject;
  plainText: string;
} {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalidNoteInput("A title and content are required.");
  }

  const body = input as Record<string, unknown>;

  if (typeof body.title !== "string") {
    throw invalidNoteInput("Title must be text.");
  }

  const title = body.title.trim();
  const noteContent = parseNoteContent(body.content);

  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    throw invalidNoteInput("Title must be between 1 and 200 characters.");
  }

  if (!noteContent) {
    throw invalidNoteInput("Content must be a valid rich text document.");
  }

  if (noteContent.plainText.length > MAX_CONTENT_LENGTH) {
    throw invalidNoteInput("Content must not exceed 50000 characters.");
  }

  if (JSON.stringify(noteContent.content).length > MAX_DOCUMENT_LENGTH) {
    throw invalidNoteInput(
      "Content document must not exceed 90000 characters.",
    );
  }

  return { title, ...noteContent };
}

function readNoteId(noteId: unknown): string {
  if (typeof noteId !== "string" || !UUID_PATTERN.test(noteId)) {
    throw invalidNoteInput("Note ID must be a valid UUID.");
  }

  return noteId;
}

function noteNotFound(): HttpError {
  return new HttpError(404, "NOTE_NOT_FOUND", "Note not found.");
}

function readSearchField(value: unknown): NoteSearchField {
  if (value === undefined || value === "" || value === "all") {
    return "all";
  }

  if (value === "title" || value === "content") {
    return value;
  }

  throw invalidNoteInput("Search field must be all, title, or content.");
}

function readSort(value: unknown): NoteSort {
  if (value === undefined || value === "" || value === "newest") {
    return "newest";
  }

  if (value === "oldest" || value === "title-asc" || value === "title-desc") {
    return value;
  }

  throw invalidNoteInput(
    "Sort must be newest, oldest, title-asc, or title-desc.",
  );
}

export class NoteService {
  private readonly repository: NoteRepository;

  public constructor(repository: NoteRepository) {
    this.repository = repository;
  }

  public createNote(userId: string, input: unknown): Promise<Note> {
    const note = readNoteInput(input);
    return this.repository.createNote(
      userId,
      note.title,
      note.content,
      note.plainText,
    );
  }

  public getNotes(
    userId: string,
    search: unknown,
    searchIn: unknown,
    sort: unknown,
  ): Promise<Note[]> {
    if (
      search !== undefined &&
      (typeof search !== "string" || search.length > MAX_SEARCH_LENGTH)
    ) {
      throw invalidNoteInput("Search must be text up to 200 characters.");
    }

    const cleanedSearch = typeof search === "string" ? search.trim() : "";

    return this.repository.getNotes(
      userId,
      cleanedSearch || undefined,
      readSearchField(searchIn),
      readSort(sort),
    );
  }

  public async getNote(userId: string, noteId: unknown): Promise<Note> {
    const note = await this.repository.getNoteById(userId, readNoteId(noteId));

    if (!note) {
      throw noteNotFound();
    }

    return note;
  }

  public async updateNote(
    userId: string,
    noteId: unknown,
    input: unknown,
  ): Promise<Note> {
    const id = readNoteId(noteId);
    const note = readNoteInput(input);
    const updatedNote = await this.repository.updateNote(
      userId,
      id,
      note.title,
      note.content,
      note.plainText,
    );

    if (!updatedNote) {
      throw noteNotFound();
    }

    return updatedNote;
  }

  public async deleteNote(userId: string, noteId: unknown): Promise<void> {
    const deleted = await this.repository.deleteNote(
      userId,
      readNoteId(noteId),
    );

    if (!deleted) {
      throw noteNotFound();
    }
  }
}
