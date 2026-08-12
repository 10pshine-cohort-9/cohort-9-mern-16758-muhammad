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
