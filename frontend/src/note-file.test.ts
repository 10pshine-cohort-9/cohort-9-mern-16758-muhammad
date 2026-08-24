import { downloadNotes, readNotesFile } from "./note-file";
import type { Note } from "./notes-api";

const richTextContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Remember the meeting" }],
    },
  ],
};

function makeFile(name: string, type: string, text: string): File {
  const file = new File([text], name, { type });

  Object.defineProperty(file, "text", {
    value: jest.fn().mockResolvedValue(text),
  });

  return file;
}

afterEach(() => {
  jest.restoreAllMocks();
});

test("downloads notes as a JSON file", () => {
  const note: Note = {
    id: "note-1",
    title: "Meeting",
    content: richTextContent,
    plainText: "Remember the meeting",
    updatedAt: "2026-08-22T10:00:00.000Z",
  };
  const downloadLink = document.createElement("a");
  const clickMock = jest
    .spyOn(downloadLink, "click")
    .mockImplementation(() => undefined);
  const createObjectUrl = jest.fn().mockReturnValue("blob:notes");
  const revokeObjectUrl = jest.fn();

  jest.spyOn(document, "createElement").mockReturnValue(downloadLink);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectUrl,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectUrl,
  });

  downloadNotes([note]);

  expect(downloadLink.download).toMatch(
    /^shine-notes-\d{4}-\d{2}-\d{2}\.json$/u,
  );
  expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
  expect(clickMock).toHaveBeenCalled();
  expect(revokeObjectUrl).toHaveBeenCalledWith("blob:notes");
});

test("reads notes from a Shine Notes JSON file", async () => {
  const file = makeFile(
    "shine-notes.json",
    "application/json",
    JSON.stringify({
      version: 1,
      notes: [{ title: "Meeting", content: richTextContent }],
    }),
  );

  await expect(readNotesFile(file)).resolves.toEqual([
    { title: "Meeting", content: richTextContent },
  ]);
});

test("turns a text file into a note", async () => {
  const file = makeFile("Ideas.txt", "text/plain", "First idea\nSecond idea");

  await expect(readNotesFile(file)).resolves.toEqual([
    {
      title: "Ideas",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "First idea" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Second idea" }],
          },
        ],
      },
    },
  ]);
});

test("rejects an invalid import file", async () => {
  const file = makeFile("notes.json", "application/json", "not valid JSON");

  await expect(readNotesFile(file)).rejects.toThrow(
    "The selected file is not valid JSON.",
  );
});
