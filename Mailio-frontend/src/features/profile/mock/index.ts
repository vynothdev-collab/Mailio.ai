import type { UserProfile, AccountInfo } from "../types";

export const MOCK_USER_PROFILE: UserProfile = {
  fullName:  "Tom Kristenson",
  email:     "tom@company.com",
  jobTitle:  "Head of Growth",
  company:   "Acme Corp",
  avatarUrl: null,
};

export const MOCK_ACCOUNT_INFO: AccountInfo = {
  accountId:   "ACC-20261847",
  memberSince: "Jan 12, 2025",
  plan:        "Pro Plan",
  status:      "active",
};
