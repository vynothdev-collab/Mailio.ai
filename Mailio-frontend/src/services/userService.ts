// User service — endpoints under /users.
// Keeps URL strings + response shapes out of components.

import { api } from "./api";
import type { UserProfile } from "@/src/types/user";

export const userService = {
  /**
   * Fetch the currently authenticated user's profile.
   * The Bearer token is attached automatically by the request interceptor;
   * 401s trigger the global refresh-or-logout flow.
   */
  async getCurrentUser(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>("/users/me");
    return data;
  },
};
