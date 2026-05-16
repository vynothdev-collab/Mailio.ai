// Shared auth-related TypeScript contracts.
// Mirrors the backend payload exactly so service ↔ UI boundaries stay type-safe.

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  plan:  string;
}

// POST /auth/signup request body
export interface SignupPayload {
  fullName: string;
  email:    string;
  password: string;
}

// POST /auth/login request body
export interface LoginPayload {
  email:    string;
  password: string;
  remember: boolean;
}

// Successful auth response (shared by /signup and /login)
export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user:         AuthUser;
}

// POST /auth/refresh request body
export interface RefreshPayload {
  refreshToken: string;
}

// POST /auth/refresh response — backend returns only a new access token
export interface RefreshResponse {
  accessToken: string;
}

// Normalized error surfaced to the UI layer
export interface ApiError {
  status:  number;
  message: string;
}
