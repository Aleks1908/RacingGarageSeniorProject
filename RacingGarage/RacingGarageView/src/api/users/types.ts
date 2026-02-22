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
