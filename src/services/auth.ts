import { apiService } from './api';
import type { IUser } from '@src/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: IUser;
  token: string;
  refreshToken: string;
}

export class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', credentials);
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', userData);
  }

  async logout(): Promise<void> {
    return apiService.post<void>('/auth/logout');
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/refresh', { refreshToken });
  }

  async getCurrentUser(): Promise<IUser> {
    return apiService.get<IUser>('/auth/me');
  }

  async updateProfile(userData: Partial<IUser>): Promise<IUser> {
    return apiService.put<IUser>('/auth/profile', userData);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return apiService.post<void>('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    return apiService.uploadFile<{ avatarUrl: string }>('/auth/avatar', file);
  }
}

export const authService = new AuthService();