import { useState, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";

import { logoutUser, type AuthenticatedUser } from "../auth-api";

interface ProfilePageProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

function ProfilePage({ user, onLogout }: ProfilePageProps): ReactElement {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    setError("");
    setSubmitting(true);

    try {
      await logoutUser();
      onLogout();
      void navigate("/login");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to log out.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="profile-page">
      <nav className="top-bar">
        <p className="brand">Shine Notes</p>
        <Link to="/notes">Back to notes</Link>
      </nav>

      <section className="profile-content">
        <h1>Your profile</h1>
        <p className="page-intro">Your account details.</p>

        <div className="profile-row">
          <span>Name</span>
          <strong>{user.name}</strong>
        </div>
        <div className="profile-row">
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleLogout()}
        >
          {submitting ? "Logging out..." : "Log out"}
        </button>
      </section>
    </main>
  );
}

export default ProfilePage;
