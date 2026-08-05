import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import NotesPage from "./pages/NotesPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";

function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/notes/new" element={<NoteEditorPage />} />
      <Route path="/notes/:noteId/edit" element={<NoteEditorPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
