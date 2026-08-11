import { useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";

import { loginUser, type AuthenticatedUser } from "../auth-api";

interface LoginPageProps {
  onAuthenticated: (user: AuthenticatedUser) => void;
}

function LoginPage({ onAuthenticated }: LoginPageProps): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const user = await loginUser(email.trim(), password);
      onAuthenticated(user);
      void navigate("/notes");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to log in.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <p className="brand">Shine Notes</p>
      <h1>Welcome back</h1>
      <p className="page-intro">Log in to continue to your notes.</p>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="auth-link">
        Do not have an account? <Link to="/signup">Sign up</Link>
      </p>
    </main>
  );
}

export default LoginPage;
