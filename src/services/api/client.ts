import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

// API base URL - should be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://echo.enjoy.bot'

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor to add auth token from store
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from auth store
    const token = useAuthStore.getState().token
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear auth
      useAuthStore.getState().logout()
      // Dispatch custom event to notify other parts of the app
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default apiClient

