import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createNote, getNote, updateNote } from "../notes-api";

function NoteEditorPage(): ReactElement {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(Boolean(noteId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const heading = noteId ? "Edit note" : "Create note";

  useEffect(() => {
    const currentNoteId = noteId;

    if (!currentNoteId) {
      return;
    }

    async function loadNote(id: string): Promise<void> {
      try {
        const savedNote = await getNote(id);
        setTitle(savedNote.title);
        setContent(savedNote.content);
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load this note.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadNote(currentNoteId);
  }, [noteId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      if (noteId) {
        await updateNote(noteId, title.trim(), content);
      } else {
        await createNote(title.trim(), content);
      }

      void navigate("/notes");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the note.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main>Loading note...</main>;
  }

  return (
    <main className="editor-page">
      <nav className="top-bar">
        <p className="brand">Shine Notes</p>
        <Link to="/notes">Back to notes</Link>
      </nav>

      <section className="editor-heading">
        <h1>{heading}</h1>
        <p className="page-intro">Give your note a title and start writing.</p>
      </section>

      <form
        className="editor-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label htmlFor="title">Title</label>
        <input
          className="note-title-input"
          id="title"
          type="text"
          placeholder="Untitled note"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <label htmlFor="content">Content</label>
        <textarea
          className="note-content-input"
          id="content"
          rows={12}
          placeholder="Start typing here..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <Link className="secondary-link" to="/notes">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

export default NoteEditorPage;
