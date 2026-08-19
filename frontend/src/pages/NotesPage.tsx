import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { Link } from "react-router-dom";

import {
  deleteNote,
  getNotes,
  type Note,
  type NoteSearchField,
  type NoteSort,
} from "../notes-api";

interface NoteFilters {
  search: string;
  searchIn: NoteSearchField;
  sort: NoteSort;
}

function NotesPage(): ReactElement {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState<NoteSearchField>("all");
  const [sort, setSort] = useState<NoteSort>("newest");
  const [activeFilters, setActiveFilters] = useState<NoteFilters>({
    search: "",
    searchIn: "all",
    sort: "newest",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRequest = useRef(0);

  async function loadNotes(filters: NoteFilters): Promise<void> {
    const requestNumber = latestRequest.current + 1;
    latestRequest.current = requestNumber;
    setLoading(true);
    setError("");

    try {
      const savedNotes = await getNotes(
        filters.search,
        filters.searchIn,
        filters.sort,
      );

      if (requestNumber !== latestRequest.current) {
        return;
      }

      setNotes(savedNotes);
    } catch (requestError: unknown) {
      if (requestNumber !== latestRequest.current) {
        return;
      }

      setNotes([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your notes.",
      );
    } finally {
      if (requestNumber === latestRequest.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadNotes({ search: "", searchIn: "all", sort: "newest" });
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const filters = { search: search.trim(), searchIn, sort };

    setActiveFilters(filters);
    void loadNotes(filters);
  }

  async function handleDelete(note: Note): Promise<void> {
    const confirmed = window.confirm(`Delete "${note.title}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteNote(note.id);
      await loadNotes(activeFilters);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete the note.",
      );
    }
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
            disabled={loading}
          />
          <select
            aria-label="Search in"
            value={searchIn}
            onChange={(event) =>
              setSearchIn(event.target.value as NoteSearchField)
            }
            disabled={loading}
          >
            <option value="all">All fields</option>
            <option value="title">Titles only</option>
            <option value="content">Content only</option>
          </select>
          <select
            aria-label="Sort notes"
            value={sort}
            onChange={(event) => setSort(event.target.value as NoteSort)}
            disabled={loading}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>
          <button type="submit" disabled={loading}>
            Search
          </button>
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
          <h2>{activeFilters.search ? "No matching notes" : "No notes yet"}</h2>
          <p>
            {activeFilters.search
              ? "Try searching for something else."
              : "Write down your first idea, reminder, or thought."}
          </p>
          {!activeFilters.search && (
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
              <p>{note.plainText || "No content"}</p>
              <div className="note-actions">
                <Link className="secondary-link" to={`/notes/${note.id}/edit`}>
                  Edit
                </Link>
                <button type="button" onClick={() => void handleDelete(note)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default NotesPage;
