// Holds the auth token for the sync API (issued by POST /api/v1/auth/login).
// Kept in memory only: the login flow should call setAuthToken() after signing
// in, and persist the token securely (e.g. expo-secure-store) once it exists.

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}
