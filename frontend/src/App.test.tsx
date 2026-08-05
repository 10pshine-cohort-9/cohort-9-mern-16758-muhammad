import { render, screen } from "@testing-library/react";

import App from "./App";

test("shows the page heading", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: "My notes!" }),
  ).toBeInTheDocument();
});
