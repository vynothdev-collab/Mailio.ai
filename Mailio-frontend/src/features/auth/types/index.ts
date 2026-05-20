export interface LoginFormData {
  email:    string;
  password: string;
  remember: boolean;
}

export interface SignupFormData {
  fullName:        string;
  email:           string;
  password:        string;
  confirmPassword: string;
  terms:           boolean;
}
