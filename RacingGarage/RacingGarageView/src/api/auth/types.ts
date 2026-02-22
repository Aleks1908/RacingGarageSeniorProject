export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresAtUtc: string;
  userId: number;
  name: string;
  email: string;
  roles: string[];
};
