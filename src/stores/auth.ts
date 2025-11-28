import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAuthToken, clearAuthToken, getAuthToken } from '@/services/api'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  isPro?: boolean
  createdAt?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token: string | null) => {
        set({ token, isAuthenticated: !!token })
        if (token) {
          setAuthToken(token)
        } else {
          clearAuthToken()
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user && !!get().token })
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        clearAuthToken()
      },
    }),
    {
      name: 'enjoy-auth',
      onRehydrateStorage: () => (state) => {
        // Sync token with API client when store is rehydrated
        if (state?.token) {
          setAuthToken(state.token)
        }
      },
    }
  )
)

// Initialize auth token from store on module load
if (typeof window !== 'undefined') {
  const token = useAuthStore.getState().token
  if (token) {
    setAuthToken(token)
  }

  // Listen for postMessage from browser extension
  window.addEventListener('message', (event) => {
    // Security: Only accept messages from same origin or trusted extension
    // In production, you should validate the origin
    if (event.data?.type === 'ENJOY_AUTH_TOKEN') {
      const { token } = event.data
      if (token) {
        useAuthStore.getState().setToken(token)
      }
    }
  })

  // Listen for unauthorized events from API interceptor
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.getState().logout()
  })
}

