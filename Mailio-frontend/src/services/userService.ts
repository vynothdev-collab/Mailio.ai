import { api } from "./api";
import type { UserProfile } from "@/src/types/user";

export const userService = {
  async getCurrentUser(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>("/users/me");
    return data;
  },

  async updateProfile(payload: { name: string }): Promise<UserProfile> {
    const { data } = await api.patch<UserProfile>("/users/me", payload);
    return data;
  },

  async requestPasswordChangeOtp(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/users/me/change-password/send-otp");
    return data;
  },

  async changePassword(payload: {
    currentPassword?: string;
    newPassword: string;
    otp: string;
  }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/users/me/change-password", payload);
    return data;
  },
};
