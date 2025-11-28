import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

// API base URL - should be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from auth store
    const token = getAuthToken()
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
      clearAuthToken()
      // Dispatch custom event to notify auth store
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

// Token management helpers
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

export function clearAuthToken() {
  authToken = null
}

// API endpoints
export const api = {
  // Materials
  materials: {
    create: (data: unknown) => apiClient.post('/api/v1/materials', data),
    get: (id: string) => apiClient.get(`/api/v1/materials/${id}`),
    list: () => apiClient.get('/api/v1/materials'),
    upload: (id: string) => apiClient.post(`/api/v1/materials/${id}/upload`),
  },

  // Sync
  sync: {
    batch: (data: unknown) => apiClient.post('/api/v1/sync', data),
  },

  // AI Services
  services: {
    asr: (data: unknown) => apiClient.post('/api/v1/services/asr', data),
    dictionary: (data: unknown) => apiClient.post('/api/v1/services/dictionary', data),
    assessment: (data: unknown) => apiClient.post('/api/v1/services/assessment', data),
  },

  // Authentication
  auth: {
    // Get current user profile
    profile: () => apiClient.get('/api/v1/user/profile'),
  },

  // User profile (if needed)
  user: {
    profile: () => apiClient.get('/api/v1/user/profile'),
  },
}

export default apiClient

