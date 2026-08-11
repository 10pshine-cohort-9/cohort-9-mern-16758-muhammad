export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user?: AuthenticatedUser;
  error?: {
    message?: string;
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as AuthResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to log in.");
  }

  if (!data.user) {
    throw new Error("The server returned an invalid response.");
  }

  return data.user;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = (await response.json()) as AuthResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to create your account.");
  }

  if (!data.user) {
    throw new Error("The server returned an invalid response.");
  }

  return data.user;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const response = await fetch("/api/auth/me");

  if (response.status === 401) {
    return null;
  }

  const data = (await response.json()) as AuthResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to load your session.");
  }

  if (!data.user) {
    throw new Error("The server returned an invalid response.");
  }

  return data.user;
}

export async function logoutUser(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    const data = (await response.json()) as AuthResponse;
    throw new Error(data.error?.message ?? "Unable to log out.");
  }
}
