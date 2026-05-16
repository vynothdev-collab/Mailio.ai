export interface UserProfile {
  fullName:   string;
  email:      string;
  jobTitle:   string;
  company:    string;
  avatarUrl:  string | null;
}

export interface AccountInfo {
  accountId:   string;
  memberSince: string;
  plan:        string;
  status:      "active" | "suspended";
}
