import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: fetchMock,
});

function mockLoggedOutResponse(): Response {
  return {
    ok: false,
    status: 401,
    json: jest.fn().mockResolvedValue(undefined),
  } as unknown as Response;
}

function renderApp(): void {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  fetchMock.mockReset();
  localStorage.clear();
  document.documentElement.classList.remove("dark-mode");
});

test("switches between dark mode and light mode", async () => {
  fetchMock.mockResolvedValueOnce(mockLoggedOutResponse());
  renderApp();

  const themeButton = await screen.findByRole("button", {
    name: "Toggle dark mode",
  });

  expect(themeButton).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(themeButton);

  expect(document.documentElement).toHaveClass("dark-mode");
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(themeButton).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(themeButton);

  expect(document.documentElement).not.toHaveClass("dark-mode");
  expect(localStorage.getItem("theme")).toBe("light");
  expect(themeButton).toHaveAttribute("aria-pressed", "false");
});

test("restores the saved dark mode", async () => {
  localStorage.setItem("theme", "dark");
  fetchMock.mockResolvedValueOnce(mockLoggedOutResponse());

  renderApp();

  const themeButton = await screen.findByRole("button", {
    name: "Toggle dark mode",
  });

  expect(themeButton).toHaveAttribute("aria-pressed", "true");
  expect(document.documentElement).toHaveClass("dark-mode");
});
