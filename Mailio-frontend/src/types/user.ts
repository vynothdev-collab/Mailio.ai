// User-domain TypeScript contracts.
// Kept separate from `auth.ts` so non-auth features can import the user
// shape without pulling in token/credential types.

/**
 * Full profile returned by GET /users/me.
 * Superset of the `AuthUser` returned by /auth/login & /auth/signup.
 */
export interface UserProfile {
  id:        string;
  email:     string;
  name:      string;
  plan:      string;
  isActive:  boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
