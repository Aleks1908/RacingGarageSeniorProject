export type UserRead = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
};

export type UserCreate = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
};

export type UserSetRole = {
  role: string;
};

export type UpdateUserDto = {
  firstName: string;
  lastName: string;
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
