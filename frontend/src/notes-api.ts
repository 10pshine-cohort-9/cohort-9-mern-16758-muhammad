import type { JSONContent } from "@tiptap/react";

import { isRichTextContent } from "./rich-text";

export interface Note {
  id: string;
  title: string;
  content: JSONContent;
  plainText: string;
  updatedAt: string;
}

interface NotesResponse {
  notes?: unknown;
  error?: {
    message?: string;
  };
}

interface NoteResponse {
  note?: unknown;
  error?: {
    message?: string;
  };
}

function plainTextContent(text: string): JSONContent {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  };
}

export function emptyNoteContent(): JSONContent {
  return plainTextContent("");
}

function readNote(value: unknown): Note | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const note = value as Record<string, unknown>;
  const content =
    typeof note.content === "string"
      ? plainTextContent(note.content)
      : isRichTextContent(note.content)
        ? note.content
        : null;

  if (
    typeof note.id === "string" &&
    typeof note.title === "string" &&
    content &&
    typeof note.plainText === "string" &&
    typeof note.updatedAt === "string"
  ) {
    return {
      id: note.id,
      title: note.title,
      content,
      plainText: note.plainText,
      updatedAt: note.updatedAt,
    };
  }

  return null;
}

function readNotes(value: unknown): Note[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const notes: Note[] = [];

  for (const valueItem of value) {
    const note = readNote(valueItem);

    if (!note) {
      return null;
    }

    notes.push(note);
  }

  return notes;
}

export async function getNotes(search = ""): Promise<Note[]> {
  const path = search
    ? `/api/notes?search=${encodeURIComponent(search)}`
    : "/api/notes";
  let response: Response;
  let data: NotesResponse;

  try {
    response = await fetch(path);
    data = (await response.json()) as NotesResponse;
  } catch {
    throw new Error("Unable to load your notes.");
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to load your notes.");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("The server returned an invalid response.");
  }

  const notes = readNotes(data.notes);

  if (!notes) {
    throw new Error("The server returned an invalid response.");
  }

  return notes;
}

export async function getNote(noteId: string): Promise<Note> {
  let response: Response;
  let data: NoteResponse;

  try {
    response = await fetch(`/api/notes/${noteId}`);
    data = (await response.json()) as NoteResponse;
  } catch {
    throw new Error("Unable to load this note.");
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to load this note.");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("The server returned an invalid response.");
  }

  const note = readNote(data.note);

  if (!note) {
    throw new Error("The server returned an invalid response.");
  }

  return note;
}

export async function createNote(
  title: string,
  content: JSONContent,
): Promise<Note> {
  let response: Response;
  let data: NoteResponse;

  try {
    response = await fetch("/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ title, content }),
    });
    data = (await response.json()) as NoteResponse;
  } catch {
    throw new Error("Unable to create the note.");
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to create the note.");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("The server returned an invalid response.");
  }

  const note = readNote(data.note);

  if (!note) {
    throw new Error("The server returned an invalid response.");
  }

  return note;
}

export async function updateNote(
  noteId: string,
  title: string,
  content: JSONContent,
): Promise<Note> {
  let response: Response;
  let data: NoteResponse;

  try {
    response = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ title, content }),
    });
    data = (await response.json()) as NoteResponse;
  } catch {
    throw new Error("Unable to update the note.");
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to update the note.");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("The server returned an invalid response.");
  }

  const note = readNote(data.note);

  if (!note) {
    throw new Error("The server returned an invalid response.");
  }

  return note;
}

export async function deleteNote(noteId: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`/api/notes/${noteId}`, {
      method: "DELETE",
    });
  } catch {
    throw new Error("Unable to delete the note.");
  }

  if (!response.ok) {
    let data: NoteResponse;

    try {
      data = (await response.json()) as NoteResponse;
    } catch {
      throw new Error("Unable to delete the note.");
    }

    throw new Error(data.error?.message ?? "Unable to delete the note.");
  }
}
