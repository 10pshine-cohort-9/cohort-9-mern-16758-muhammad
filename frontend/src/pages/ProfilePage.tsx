import type { ReactElement } from "react";
import { Link } from "react-router-dom";

function ProfilePage(): ReactElement {
  return (
    <main className="profile-page">
      <nav className="top-bar">
        <p className="brand">Shine Notes</p>
        <Link to="/notes">Back to notes</Link>
      </nav>

      <section className="profile-content">
        <h1>Your profile</h1>
        <p className="page-intro">
          Demo profile.
        </p>

        <div className="profile-row">
          <span>Name</span>
          <strong>Not available yet</strong>
        </div>
        <div className="profile-row">
          <span>Email</span>
          <strong>Not available yet</strong>
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
