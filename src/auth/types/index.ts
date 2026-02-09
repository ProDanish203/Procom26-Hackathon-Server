import { User, UserRole } from '@db';

export type JwtPayload = {
  id: string;
  email: string;
  role: UserRole;
};

export interface RegisterUserResponse {
  user: Omit<User, 'password' | 'salt'>;
  token: string;
}

export interface LoginUserResponse {
  user: Omit<User, 'password' | 'salt'>;
  token: string;
}

export interface OtpVerificationResponse {
  token?: string;
}
