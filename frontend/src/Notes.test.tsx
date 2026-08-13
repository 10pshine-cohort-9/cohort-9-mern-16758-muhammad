import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import NoteEditorPage from "./pages/NoteEditorPage";
import NotesPage from "./pages/NotesPage";

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: fetchMock,
});

function mockResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function renderEditor(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/notes/new" element={<NoteEditorPage />} />
        <Route path="/notes/:noteId/edit" element={<NoteEditorPage />} />
        <Route path="/notes" element={<h1>Notes list</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  fetchMock.mockReset();
  jest.restoreAllMocks();
});

test("loads and searches notes", async () => {
  fetchMock
    .mockResolvedValueOnce(
      mockResponse(200, {
        notes: [
          {
            id: "note-1",
            title: "Shopping list",
            content: "Buy milk",
            updatedAt: "2026-08-13T10:00:00.000Z",
          },
        ],
      }),
    )
    .mockResolvedValueOnce(
      mockResponse(200, {
        notes: [
          {
            id: "note-2",
            title: "Meeting notes",
            content: "Discuss the project",
            updatedAt: "2026-08-13T11:00:00.000Z",
          },
        ],
      }),
    );

  render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Shopping list")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Search notes"), {
    target: { value: "meeting" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(await screen.findByText("Meeting notes")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith("/api/notes?search=meeting");
});

test("shows an error for an invalid notes response", async () => {
  fetchMock.mockResolvedValueOnce(mockResponse(200, { notes: {} }));

  render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The server returned an invalid response.",
  );
});

test("shows a simple error when a notes response is not JSON", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: jest.fn().mockRejectedValue(new SyntaxError("Invalid JSON")),
  } as unknown as Response);

  render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to load your notes.",
  );
});

test("creates a note", async () => {
  fetchMock.mockResolvedValueOnce(
    mockResponse(201, {
      note: {
        id: "note-1",
        title: "New idea",
        content: "Build a notes app",
        updatedAt: "2026-08-13T10:00:00.000Z",
      },
    }),
  );

  renderEditor("/notes/new");

  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "New idea" },
  });
  fireEvent.change(screen.getByLabelText("Content"), {
    target: { value: "Build a notes app" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByRole("heading", { name: "Notes list" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/notes",
    expect.objectContaining({ method: "POST" }),
  );
});

test("edits a note", async () => {
  fetchMock
    .mockResolvedValueOnce(
      mockResponse(200, {
        note: {
          id: "note-1",
          title: "Old title",
          content: "Old content",
          updatedAt: "2026-08-13T10:00:00.000Z",
        },
      }),
    )
    .mockResolvedValueOnce(
      mockResponse(200, {
        note: {
          id: "note-1",
          title: "Updated title",
          content: "Updated content",
          updatedAt: "2026-08-13T11:00:00.000Z",
        },
      }),
    );

  renderEditor("/notes/note-1/edit");

  const titleInput = await screen.findByLabelText("Title");
  fireEvent.change(titleInput, { target: { value: "Updated title" } });
  fireEvent.change(screen.getByLabelText("Content"), {
    target: { value: "Updated content" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByRole("heading", { name: "Notes list" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/notes/note-1",
    expect.objectContaining({ method: "PUT" }),
  );
});

test("hides the editor when a note fails to load", async () => {
  fetchMock.mockResolvedValueOnce(
    mockResponse(404, { error: { message: "Note not found." } }),
  );

  renderEditor("/notes/note-1/edit");

  expect(await screen.findByRole("alert")).toHaveTextContent("Note not found.");
  expect(
    screen.queryByRole("button", { name: "Save" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Back to notes" }),
  ).toBeInTheDocument();
});

test("deletes a note", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  fetchMock
    .mockResolvedValueOnce(
      mockResponse(200, {
        notes: [
          {
            id: "note-1",
            title: "Delete me",
            content: "Temporary note",
            updatedAt: "2026-08-13T10:00:00.000Z",
          },
        ],
      }),
    )
    .mockResolvedValueOnce(mockResponse(204))
    .mockResolvedValueOnce(mockResponse(200, { notes: [] }));

  render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  );

  await screen.findByText("Delete me");
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(
    await screen.findByRole("heading", { name: "No notes yet" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/notes/note-1", {
    method: "DELETE",
  });
});
