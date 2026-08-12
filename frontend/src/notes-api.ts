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

export async function getNotes(search = ""): Promise<Note[]> {
  const path = search
    ? `/api/notes?search=${encodeURIComponent(search)}`
    : "/api/notes";
  const response = await fetch(path);
  const data = (await response.json()) as NotesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to load your notes.");
  }

  if (!data.notes) {
    throw new Error("The server returned an invalid response.");
  }

  return data.notes;
}

export async function getNote(noteId: string): Promise<Note> {
  const response = await fetch(`/api/notes/${noteId}`);
  const data = (await response.json()) as NoteResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to load this note.");
  }

  if (!data.note) {
    throw new Error("The server returned an invalid response.");
  }

  return data.note;
}

export async function createNote(
  title: string,
  content: string,
): Promise<Note> {
  const response = await fetch("/api/notes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ title, content }),
  });
  const data = (await response.json()) as NoteResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to create the note.");
  }

  if (!data.note) {
    throw new Error("The server returned an invalid response.");
  }

  return data.note;
}

export async function updateNote(
  noteId: string,
  title: string,
  content: string,
): Promise<Note> {
  const response = await fetch(`/api/notes/${noteId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ title, content }),
  });
  const data = (await response.json()) as NoteResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to update the note.");
  }

  if (!data.note) {
    throw new Error("The server returned an invalid response.");
  }

  return data.note;
}

export async function deleteNote(noteId: string): Promise<void> {
  const response = await fetch(`/api/notes/${noteId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json()) as NoteResponse;
    throw new Error(data.error?.message ?? "Unable to delete the note.");
  }
}
