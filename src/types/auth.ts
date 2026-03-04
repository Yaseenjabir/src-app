export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  token_type: "Bearer";
  expires_in: string;
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};
