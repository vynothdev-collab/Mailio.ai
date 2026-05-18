interface AuthUser {
  id:        string;
  name:      string;
  email:     string;
  plan:      string;
  avatarUrl?: string | null;
  provider?: "LOCAL" | "GOOGLE";
}

export interface GoogleLoginPayload {
  idToken: string;
  remember?: boolean;
}

export interface SignupPayload {
  fullName: string;
  email:    string;
  password: string;
}

export interface LoginPayload {
  email:    string;
  password: string;
  remember: boolean;
}

export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user:         AuthUser;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface ApiError {
  status:  number;
  message: string;
}
