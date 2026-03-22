export type UserRead = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
};

export type UserCreate = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type UserSetRole = {
  role: string;
};

export type UpdateUserDto = {
  name: string;
  email: string;
  oldPassword: string;
};

export type ChangeUserPasswordDto = {
  oldPassword: string;
  newPassword: string;
};

export type AuthRefreshResponse = {
  token: string;
  user: UserRead;
};
