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
  );
}

export default App;
