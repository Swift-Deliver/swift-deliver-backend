import { Role, User } from '@prisma/client';

export interface UserPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}

export interface LocalRequestWithUser extends Request {
  user: Omit<User, 'password'>;
}
