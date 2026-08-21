import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { Link } from "react-router-dom";

import { downloadNotes, readNotesFile } from "../note-file";
import {
  createNote,
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
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const latestRequest = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

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

    setMessage("");
    setActiveFilters(filters);
    void loadNotes(filters);
  }

  async function handleDelete(note: Note): Promise<void> {
    const confirmed = window.confirm(`Delete "${note.title}"?`);

    if (!confirmed) {
      return;
    }

    setMessage("");

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

  async function handleExport(): Promise<void> {
    setExporting(true);
    setError("");
    setMessage("");

    try {
      const allNotes = await getNotes();
      downloadNotes(allNotes);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to export your notes.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImporting(true);
    setError("");
    setMessage("");
    let importedCount = 0;

    try {
      const importedNotes = await readNotesFile(file);

      for (const note of importedNotes) {
        await createNote(note.title, note.content);
        importedCount += 1;
      }

      await loadNotes(activeFilters);
      setMessage(
        `Imported ${importedCount} ${importedCount === 1 ? "note" : "notes"}.`,
      );
    } catch (requestError: unknown) {
      if (importedCount > 0) {
        await loadNotes(activeFilters);
      }

      setError(
        importedCount > 0
          ? `Imported ${importedCount} notes, but the import could not be completed.`
          : requestError instanceof Error
            ? requestError.message
            : "Unable to import your notes.",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="dashboard-page">
      <nav className="top-bar">
        <p className="brand">Shine Notes</p>
        <div className="nav-links">
          <Link to="/profile">Profile</Link>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={(event) => void handleImport(event)}
            hidden
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={loading || importing || exporting}
          >
            {importing ? "Importing..." : "Import notes"}
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={loading || importing || exporting}
          >
            {exporting ? "Exporting..." : "Export notes"}
          </button>
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

      {message && (
        <p className="success" role="status">
          {message}
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
