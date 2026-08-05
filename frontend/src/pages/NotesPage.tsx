import type { ReactElement } from "react";
import { Link } from "react-router-dom";

function NotesPage(): ReactElement {
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

      <section className="empty-state">
        <span className="empty-state-icon" aria-hidden="true">
          Aa
        </span>
        <h2>No notes yet</h2>
        <p>Write down your first idea, reminder, or thought.</p>
        <Link className="primary-link" to="/notes/new">
          Create your first note
        </Link>
      </section>
    </main>
  );
}

export default NotesPage;
