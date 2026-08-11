import { useState, type ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import type { AuthenticatedUser } from "./auth-api";
import LoginPage from "./pages/LoginPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import NotesPage from "./pages/NotesPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";

function App(): ReactElement {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

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
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/notes/new" element={<NoteEditorPage />} />
      <Route path="/notes/:noteId/edit" element={<NoteEditorPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
