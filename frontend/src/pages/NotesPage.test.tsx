import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import NotesPage from "./NotesPage";

test("shows the notes heading", () => {
  render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: "My notes!" }),
  ).toBeInTheDocument();
});
