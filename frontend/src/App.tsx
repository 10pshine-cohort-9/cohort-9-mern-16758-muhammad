import { useEffect, useState, type ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { getCurrentUser, type AuthenticatedUser } from "./auth-api";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import NotesPage from "./pages/NotesPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";

function App(): ReactElement {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    async function loadSession(): Promise<void> {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error: unknown) {
        setSessionError(
          error instanceof Error
            ? error.message
            : "Unable to load your session.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSession();
  }, []);

  if (loading) {
    return <main>Loading...</main>;
  }

  if (sessionError) {
    return (
      <main>
        <p className="error" role="alert">
          {sessionError}
        </p>
      </main>
    );
  }

  return (
    <>
      <button
        className="theme-toggle"
        type="button"
        aria-label="Toggle dark mode"
        aria-pressed={darkMode}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setDarkMode(!darkMode)}
      >
        {darkMode ? (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z" />
          </svg>
        )}
      </button>

      <Routes>
        <Route
          path="/"
          element={<Navigate to={user ? "/notes" : "/login"} replace />}
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/notes" replace />
            ) : (
              <LoginPage onAuthenticated={setUser} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            user ? (
              <Navigate to="/notes" replace />
            ) : (
              <SignupPage onAuthenticated={setUser} />
            )
          }
        />
        <Route element={<ProtectedRoute isAuthenticated={Boolean(user)} />}>
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/new" element={<NoteEditorPage />} />
          <Route path="/notes/:noteId/edit" element={<NoteEditorPage />} />
          <Route
            path="/profile"
            element={
              user ? (
                <ProfilePage user={user} onLogout={() => setUser(null)} />
              ) : null
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
