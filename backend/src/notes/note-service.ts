import type { Note } from "../generated/prisma/client.js";
import { HttpError } from "../middleware/error-handler.js";
import type { NoteRepository } from "../repositories/note-repository.js";

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50_000;
const MAX_SEARCH_LENGTH = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function invalidNoteInput(message: string): HttpError {
  return new HttpError(400, "INVALID_NOTE_INPUT", message);
}

function readNoteInput(input: unknown): { title: string; content: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalidNoteInput("A title and content are required.");
  }

  const body = input as Record<string, unknown>;

  if (typeof body.title !== "string") {
    throw invalidNoteInput("Title must be text.");
  }

  if (typeof body.content !== "string") {
    throw invalidNoteInput("Content must be text.");
  }

  const title = body.title.trim();

  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    throw invalidNoteInput("Title must be between 1 and 200 characters.");
  }

  if (body.content.length > MAX_CONTENT_LENGTH) {
    throw invalidNoteInput("Content must not exceed 50000 characters.");
  }

  return { title, content: body.content };
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

export class NoteService {
  private readonly repository: NoteRepository;

  public constructor(repository: NoteRepository) {
    this.repository = repository;
  }

  public createNote(userId: string, input: unknown): Promise<Note> {
    const note = readNoteInput(input);
    return this.repository.createNote(userId, note.title, note.content);
  }

  public getNotes(userId: string, search: unknown): Promise<Note[]> {
    if (search === undefined || search === "") {
      return this.repository.getNotes(userId);
    }

    if (typeof search !== "string" || search.length > MAX_SEARCH_LENGTH) {
      throw invalidNoteInput("Search must be text up to 200 characters.");
    }

    const cleanedSearch = search.trim();

    return cleanedSearch
      ? this.repository.getNotes(userId, cleanedSearch)
      : this.repository.getNotes(userId);
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
