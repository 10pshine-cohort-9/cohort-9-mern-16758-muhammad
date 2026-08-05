import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";

function NoteEditorPage(): ReactElement {
  const { noteId } = useParams();
  const heading = noteId ? "Edit note" : "Create note";

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

      <form className="editor-form">
        <label htmlFor="title">Title</label>
        <input
          className="note-title-input"
          id="title"
          type="text"
          placeholder="Untitled note"
        />

        <label htmlFor="content">Content</label>
        <textarea
          className="note-content-input"
          id="content"
          rows={12}
          placeholder="Start typing here..."
        />

        <div className="actions">
          <button className="primary-button" type="button" disabled>
            Save
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
