import type { Note } from "./notes-api";
import { isRichTextContent } from "./rich-text";

const MAX_IMPORT_FILE_SIZE = 5_000_000;
const MAX_IMPORTED_NOTES = 100;

export interface NoteFileItem {
  title: string;
  content: Note["content"];
}

interface NotesExport {
  version: 1;
  exportedAt: string;
  notes: NoteFileItem[];
}

function plainTextContent(text: string): Note["content"] {
  return {
    type: "doc",
    content: text.split(/\r?\n/u).map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  };
}

function titleFromFileName(fileName: string): string {
  const title = fileName.replace(/\.[^.]+$/u, "").trim();
  return title.slice(0, 200) || "Imported note";
}

function readNoteFileItem(value: unknown): NoteFileItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const note = value as Record<string, unknown>;

  if (
    typeof note.title !== "string" ||
    note.title.trim().length === 0 ||
    note.title.trim().length > 200 ||
    !isRichTextContent(note.content)
  ) {
    return null;
  }

  return {
    title: note.title.trim(),
    content: note.content,
  };
}

export function downloadNotes(notes: Note[]): void {
  const notesExport: NotesExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notes.map((note) => ({
      title: note.title,
      content: note.content,
    })),
  };

  const file = new Blob([JSON.stringify(notesExport, null, 2)], {
    type: "application/json",
  });
  const fileUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");

  downloadLink.href = fileUrl;
  downloadLink.download = `shine-notes-${new Date().toISOString().slice(0, 10)}.json`;
  downloadLink.click();
  URL.revokeObjectURL(fileUrl);
}

export async function readNotesFile(file: File): Promise<NoteFileItem[]> {
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error("The import file must be smaller than 5 MB.");
  }

  const fileText = await file.text();

  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    return [
      {
        title: titleFromFileName(file.name),
        content: plainTextContent(fileText),
      },
    ];
  }

  let value: unknown;

  try {
    value = JSON.parse(fileText) as unknown;
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The selected file is not a Shine Notes export.");
  }

  const notesExport = value as Record<string, unknown>;

  if (notesExport.version !== 1 || !Array.isArray(notesExport.notes)) {
    throw new Error("The selected file is not a Shine Notes export.");
  }

  if (notesExport.notes.length > MAX_IMPORTED_NOTES) {
    throw new Error("You can import up to 100 notes at a time.");
  }

  const notes: NoteFileItem[] = [];

  for (const valueItem of notesExport.notes) {
    const note = readNoteFileItem(valueItem);

    if (!note) {
      throw new Error("The import file contains an invalid note.");
    }

    notes.push(note);
  }

  return notes;
}
