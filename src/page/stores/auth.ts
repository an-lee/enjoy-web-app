import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { closeDatabase } from '@/page/db'
import { createLogger } from '@/shared/lib/utils'

const log = createLogger({ name: 'auth-store' })

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
        // Token is automatically retrieved from store by API client interceptor
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user && !!get().token })
      },

      logout: async () => {
        const currentUser = get().user
        const userId = currentUser?.id || null

        // Close database for the logged-out user
        if (userId) {
          try {
            await closeDatabase(userId)
            log.info(`Database closed for user: ${userId}`)
          } catch (error) {
            log.error(`Failed to close database for user ${userId}:`, error)
          }
        }

        // Clear state first
        set({ token: null, user: null, isAuthenticated: false })

        // Clear persisted data from localStorage to prevent restore
        if (typeof window !== 'undefined') {
          localStorage.removeItem('enjoy-auth')
        }
        // Token is automatically retrieved from store by API client interceptor
      },
    }),
    {
      name: 'enjoy-auth',
      // Token is automatically retrieved from store by API client interceptor
      // No need to sync manually
    }
  )
)

// Listen for postMessage from browser extension
if (typeof window !== 'undefined') {
  // Token is automatically retrieved from store by API client interceptor
  // No need to initialize manually

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

