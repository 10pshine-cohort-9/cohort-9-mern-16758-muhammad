import { useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";

function SignupPage(): ReactElement {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
  }

  return (
    <main className="auth-page">
      <p className="brand">Shine Notes</p>
      <h1>Create your account</h1>
      <p className="page-intro">Keep your notes together in one place.</p>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

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
          Create account
        </button>
      </form>

      <p className="auth-link">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}

export default SignupPage;
