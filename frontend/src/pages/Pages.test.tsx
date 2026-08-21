import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";

test("shows an error when the login form is empty", () => {
  render(
    <MemoryRouter>
      <LoginPage onAuthenticated={jest.fn()} />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Log in" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Please enter your email and password.",
  );
});

test("shows an error when the signup form is empty", () => {
  render(
    <MemoryRouter>
      <SignupPage onAuthenticated={jest.fn()} />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Please fill in all fields.",
  );
});

test("shows an error when the signup password is too short", () => {
  render(
    <MemoryRouter>
      <SignupPage onAuthenticated={jest.fn()} />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Umer" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "umer@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "short-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Password must be at least 15 characters.",
  );
});
