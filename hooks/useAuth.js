import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Configure axios with auth interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return null;

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken
      });

      const { token: newToken } = response.data;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }, [refreshToken]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { user: userData, token: accessToken, refreshToken: newRefreshToken } = response.data;

      setUser(userData);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      return userData;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error en el login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, name, organization_slug = null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name,
        organization_slug
      });

      const { user: userData, token: accessToken, refreshToken: newRefreshToken } = response.data;

      setUser(userData);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      return userData;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error en el registro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setError(null);

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, []);

  const getProfile = useCallback(async () => {
    if (!token) return null;

    try {
      const response = await axios.get(`${API_URL}/auth/profile`);
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }, [token]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!token || !refreshToken) return;

    const tokenExpiration = 55 * 60 * 1000; // 55 minutes (5 minutes before 1 hour)
    const refreshTimer = setTimeout(() => {
      refreshAccessToken();
    }, tokenExpiration);

    return () => clearTimeout(refreshTimer);
  }, [token, refreshToken, refreshAccessToken]);

  // Get profile on mount if token exists
  useEffect(() => {
    if (token && !user) {
      getProfile();
    }
  }, [token, user, getProfile]);

  return {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    getProfile,
    isAuthenticated: !!token && !!user
  };
}
