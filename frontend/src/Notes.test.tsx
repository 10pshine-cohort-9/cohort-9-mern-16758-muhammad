import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import NoteEditorPage from "./pages/NoteEditorPage";
import NotesPage from "./pages/NotesPage";
import { isRichTextContent } from "./rich-text";

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

function readRequestBody(options: RequestInit | undefined): unknown {
  expect(typeof options?.body).toBe("string");
  return JSON.parse(options?.body as string) as unknown;
}

function deeplyNestedContent(): Record<string, unknown> {
  let node: Record<string, unknown> = {
    type: "paragraph",
    content: [{ type: "text", text: "Too deep" }],
  };

  for (let index = 0; index < 12; index += 1) {
    node = {
      type: "bulletList",
      content: [{ type: "listItem", content: [node] }],
    };
  }

  return { type: "doc", content: [node] };
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

test("loads, filters, and sorts notes", async () => {
  fetchMock
    .mockResolvedValueOnce(
      mockResponse(200, {
        notes: [
          {
            id: "note-1",
            title: "Shopping list",
            content: "Buy milk",
            plainText: "Buy milk",
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
            plainText: "Discuss the project",
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
  fireEvent.change(screen.getByLabelText("Search in"), {
    target: { value: "content" },
  });
  fireEvent.change(screen.getByLabelText("Sort notes"), {
    target: { value: "title-asc" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(await screen.findByText("Meeting notes")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/notes?search=meeting&searchIn=content&sort=title-asc",
  );
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

test("rejects unsafe rich text", () => {
  expect(
    isRichTextContent({
      type: "doc",
      content: [{ type: "codeBlock" }],
    }),
  ).toBe(false);
  expect(isRichTextContent(deeplyNestedContent())).toBe(false);
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
        plainText: "Build a notes app",
        updatedAt: "2026-08-13T10:00:00.000Z",
      },
    }),
  );

  renderEditor("/notes/new");

  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "New idea" },
  });

  expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Bullet list" }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByRole("heading", { name: "Notes list" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/notes",
    expect.objectContaining({ method: "POST" }),
  );

  const createOptions = fetchMock.mock.calls[0]?.[1];
  expect(readRequestBody(createOptions)).toEqual({
    title: "New idea",
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
  });
});

test("edits a note", async () => {
  fetchMock
    .mockResolvedValueOnce(
      mockResponse(200, {
        note: {
          id: "note-1",
          title: "Old title",
          content: "Old content",
          plainText: "Old content",
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
          plainText: "Updated content",
          updatedAt: "2026-08-13T11:00:00.000Z",
        },
      }),
    );

  renderEditor("/notes/note-1/edit");

  const titleInput = await screen.findByLabelText("Title");
  expect(screen.getByLabelText("Content")).toHaveTextContent("Old content");

  fireEvent.change(titleInput, { target: { value: "Updated title" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByRole("heading", { name: "Notes list" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/notes/note-1",
    expect.objectContaining({ method: "PUT" }),
  );

  const updateOptions = fetchMock.mock.calls[1]?.[1];
  expect(readRequestBody(updateOptions)).toEqual({
    title: "Updated title",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Old content" }],
        },
      ],
    },
  });
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
            plainText: "Temporary note",
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
