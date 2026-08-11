import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

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

function renderApp(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  fetchMock.mockReset();
});

test("redirects a logged-out user to login", async () => {
  fetchMock.mockResolvedValueOnce(mockResponse(401));

  renderApp("/notes");

  expect(
    await screen.findByRole("heading", { name: "Welcome back" }),
  ).toBeInTheDocument();
});

test("logs in and opens the notes page", async () => {
  fetchMock.mockResolvedValueOnce(mockResponse(401)).mockResolvedValueOnce(
    mockResponse(200, {
      user: {
        id: "user-1",
        name: "Umer",
        email: "umer@example.com",
      },
    }),
  );

  renderApp("/login");

  await screen.findByRole("heading", { name: "Welcome back" });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "umer@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));

  expect(
    await screen.findByRole("heading", { name: "My notes!" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/auth/login",
    expect.objectContaining({ method: "POST" }),
  );
});

test("creates an account and opens the notes page", async () => {
  fetchMock.mockResolvedValueOnce(mockResponse(401)).mockResolvedValueOnce(
    mockResponse(201, {
      user: {
        id: "user-1",
        name: "Umer",
        email: "umer@example.com",
      },
    }),
  );

  renderApp("/signup");

  await screen.findByRole("heading", { name: "Create your account" });
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Umer" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "umer@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  expect(
    await screen.findByRole("heading", { name: "My notes!" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/auth/register",
    expect.objectContaining({ method: "POST" }),
  );
});

test("shows the saved user and logs out", async () => {
  fetchMock
    .mockResolvedValueOnce(
      mockResponse(200, {
        user: {
          id: "user-1",
          name: "Umer",
          email: "umer@example.com",
        },
      }),
    )
    .mockResolvedValueOnce(mockResponse(204));

  renderApp("/profile");

  expect(await screen.findByText("Umer")).toBeInTheDocument();
  expect(screen.getByText("umer@example.com")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Log out" }));

  expect(
    await screen.findByRole("heading", { name: "Welcome back" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/logout", {
    method: "POST",
  });
});
