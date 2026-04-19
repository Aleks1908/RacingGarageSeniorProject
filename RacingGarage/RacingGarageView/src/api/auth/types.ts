export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresAtUtc: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
};
