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

  fireEvent.click(await screen.findByRole("button", { name: "Dark mode" }));

  expect(document.documentElement).toHaveClass("dark-mode");
  expect(localStorage.getItem("theme")).toBe("dark");

  fireEvent.click(screen.getByRole("button", { name: "Light mode" }));

  expect(document.documentElement).not.toHaveClass("dark-mode");
  expect(localStorage.getItem("theme")).toBe("light");
});

test("restores the saved dark mode", async () => {
  localStorage.setItem("theme", "dark");
  fetchMock.mockResolvedValueOnce(mockLoggedOutResponse());

  renderApp();

  expect(
    await screen.findByRole("button", { name: "Light mode" }),
  ).toBeInTheDocument();
  expect(document.documentElement).toHaveClass("dark-mode");
});
