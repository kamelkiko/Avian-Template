import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService, type LoginRequest, type RegisterRequest } from '@src/services/auth';
import { webSocketService } from '@src/services/websocket';
import type { IUser } from '@src/types';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<IUser | null>(null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'));
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isGuest = computed(() => !isAuthenticated.value);

  // Actions
  const login = async (credentials: LoginRequest) => {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await authService.login(credentials);
      
      user.value = response.user;
      token.value = response.token;
      refreshToken.value = response.refreshToken;

      // Store tokens in localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);

      // Connect to WebSocket
      await webSocketService.connect();

      return response;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await authService.register(userData);
      
      user.value = response.user;
      token.value = response.token;
      refreshToken.value = response.refreshToken;

      // Store tokens in localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);

      // Connect to WebSocket
      await webSocketService.connect();

      return response;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    try {
      if (token.value) {
        await authService.logout();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear state
      user.value = null;
      token.value = null;
      refreshToken.value = null;

      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');

      // Disconnect WebSocket
      webSocketService.disconnect();
    }
  };

  const refreshAuthToken = async () => {
    try {
      if (!refreshToken.value) {
        throw new Error('No refresh token available');
      }

      const response = await authService.refreshToken(refreshToken.value);
      
      token.value = response.token;
      refreshToken.value = response.refreshToken;

      // Update localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);

      return response;
    } catch (err) {
      // If refresh fails, logout user
      await logout();
      throw err;
    }
  };

  const getCurrentUser = async () => {
    try {
      if (!token.value) return null;

      const userData = await authService.getCurrentUser();
      user.value = userData;
      return userData;
    } catch (err) {
      console.error('Get current user error:', err);
      return null;
    }
  };

  const updateProfile = async (userData: Partial<IUser>) => {
    try {
      isLoading.value = true;
      error.value = null;

      const updatedUser = await authService.updateProfile(userData);
      user.value = updatedUser;

      return updatedUser;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Profile update failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      isLoading.value = true;
      error.value = null;

      await authService.changePassword(oldPassword, newPassword);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Password change failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await authService.uploadAvatar(file);
      
      if (user.value) {
        user.value.avatar = response.avatarUrl;
      }

      return response;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Avatar upload failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  // Initialize auth state on store creation
  const initialize = async () => {
    if (token.value) {
      try {
        await getCurrentUser();
        if (user.value) {
          await webSocketService.connect();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        await logout();
      }
    }
  };

  return {
    // State
    user,
    token,
    refreshToken,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    isGuest,

    // Actions
    login,
    register,
    logout,
    refreshAuthToken,
    getCurrentUser,
    updateProfile,
    changePassword,
    uploadAvatar,
    clearError,
    initialize,
  };
});