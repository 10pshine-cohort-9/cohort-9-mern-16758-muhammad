import { useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";

function LoginPage(): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");
  }

  return (
    <main className="auth-page">
      <p className="brand">Shine Notes</p>
      <h1>Welcome back</h1>
      <p className="page-intro">Log in to continue to your notes.</p>

      <form onSubmit={handleSubmit} noValidate>
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

        <button className="primary-button" type="submit">
          Log in
        </button>
      </form>

      <p className="auth-link">
        Do not have an account? <Link to="/signup">Sign up</Link>
      </p>
    </main>
  );
}

export default LoginPage;
