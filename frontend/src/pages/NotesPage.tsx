import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";

import { getNotes, type Note } from "../notes-api";

function NotesPage(): ReactElement {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotes(searchValue: string): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const savedNotes = await getNotes(searchValue);
      setNotes(savedNotes);
    } catch (requestError: unknown) {
      setNotes([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your notes.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes("");
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const cleanedSearch = search.trim();

    setActiveSearch(cleanedSearch);
    void loadNotes(cleanedSearch);
  }

  return (
    <main className="dashboard-page">
      <nav className="top-bar">
        <p className="brand">Shine Notes</p>
        <div className="nav-links">
          <Link to="/profile">Profile</Link>
          <Link className="primary-link" to="/notes/new">
            New note
          </Link>
        </div>
      </nav>

      <section className="notes-heading">
        <h1>My notes!</h1>
        <p className="page-intro">Your saved notes will appear here.</p>
      </section>

      <form className="search-form" onSubmit={handleSearch} role="search">
        <label htmlFor="note-search">Search notes</label>
        <div className="search-controls">
          <input
            id="note-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or content"
          />
          <button type="submit">Search</button>
        </div>
      </form>

      {loading && <p>Loading notes...</p>}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && notes.length === 0 && (
        <section className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            Aa
          </span>
          <h2>{activeSearch ? "No matching notes" : "No notes yet"}</h2>
          <p>
            {activeSearch
              ? "Try searching for something else."
              : "Write down your first idea, reminder, or thought."}
          </p>
          {!activeSearch && (
            <Link className="primary-link" to="/notes/new">
              Create your first note
            </Link>
          )}
        </section>
      )}

      {!loading && !error && notes.length > 0 && (
        <section className="notes-list" aria-label="Saved notes">
          {notes.map((note) => (
            <article className="note-card" key={note.id}>
              <h2>{note.title}</h2>
              <p>{note.content || "No content"}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default NotesPage;
