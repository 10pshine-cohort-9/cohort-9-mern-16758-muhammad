export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

interface NotesResponse {
  notes?: Note[];
  error?: {
    message?: string;
  };
}

interface NoteResponse {
  note?: Note;
  error?: {
    message?: string;
  };
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const note = value as Record<string, unknown>;

  return (
    typeof note.id === "string" &&
    typeof note.title === "string" &&
    typeof note.content === "string" &&
    typeof note.updatedAt === "string"
  );
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

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray(data.notes) ||
    !data.notes.every(isNote)
  ) {
    throw new Error("The server returned an invalid response.");
  }

  return data.notes;
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

  if (typeof data !== "object" || data === null || !isNote(data.note)) {
    throw new Error("The server returned an invalid response.");
  }

  return data.note;
}

export async function createNote(
  title: string,
  content: string,
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

  if (typeof data !== "object" || data === null || !isNote(data.note)) {
    throw new Error("The server returned an invalid response.");
  }

  return data.note;
}

export async function updateNote(
  noteId: string,
  title: string,
  content: string,
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

  if (typeof data !== "object" || data === null || !isNote(data.note)) {
    throw new Error("The server returned an invalid response.");
  }

  return data.note;
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
