import type { Note } from "./notes-api";

interface ExportedNote {
  title: string;
  content: Note["content"];
}

interface NotesExport {
  version: 1;
  exportedAt: string;
  notes: ExportedNote[];
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
