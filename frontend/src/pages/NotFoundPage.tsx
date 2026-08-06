import type { ReactElement } from "react";
import { Link } from "react-router-dom";

function NotFoundPage(): ReactElement {
  return (
    <main className="not-found-page">
      <p className="brand">Shine Notes</p>
      <p className="error-code">404</p>
      <h1>Page not found</h1>
      <p className="page-intro">The page you requested does not exist.</p>
      <Link className="primary-link" to="/login">
        Go to login
      </Link>
    </main>
  );
}

export default NotFoundPage;
