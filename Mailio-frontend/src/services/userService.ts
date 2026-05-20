import { api } from "./api";
import type { UserProfile } from "@/src/types/user";

export const userService = {
  async getCurrentUser(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>("/users/me");
    return data;
  },
};
