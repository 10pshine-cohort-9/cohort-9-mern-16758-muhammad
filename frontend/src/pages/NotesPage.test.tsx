import { render, screen } from "@testing-library/react";

import NotesPage from "./NotesPage";

test("shows the notes heading", () => {
  render(<NotesPage />);

  expect(
    screen.getByRole("heading", { name: "My notes!" }),
  ).toBeInTheDocument();
});
