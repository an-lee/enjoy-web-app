/**
 * Tests for Auth Store (Zustand)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAuthStore, type User } from './auth'

describe('Auth Store', () => {
  // Store the original state
  const getInitialState = () => ({
    token: null,
    user: null,
    isAuthenticated: false,
  })

  beforeEach(() => {
    localStorage.clear()
    // Get actions from store and reset only the data properties
    const store = useAuthStore.getState()
    useAuthStore.setState({
      ...getInitialState(),
      // Preserve the actions
      setToken: store.setToken,
      setUser: store.setUser,
      logout: store.logout,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have null token initially', () => {
      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
    })

    it('should have null user initially', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })

    it('should not be authenticated initially', () => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('setToken', () => {
    it('should set token and update isAuthenticated to true', () => {
      useAuthStore.getState().setToken('test-token-123')
      const state = useAuthStore.getState()
      expect(state.token).toBe('test-token-123')
      expect(state.isAuthenticated).toBe(true)
    })

    it('should set isAuthenticated to false when token is null', () => {
      // First set a token
      useAuthStore.getState().setToken('test-token')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      // Then clear it
      useAuthStore.getState().setToken(null)
      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('setUser', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      isPro: false,
      createdAt: '2024-01-01T00:00:00Z',
    }

    it('should set user', () => {
      useAuthStore.getState().setUser(mockUser)
      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
    })

    it('should set isAuthenticated to true when user and token are both present', () => {
      useAuthStore.getState().setToken('test-token')
      useAuthStore.getState().setUser(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('should set isAuthenticated to false when user is set but no token', () => {
      useAuthStore.getState().setUser(mockUser)
      // Without token, should not be fully authenticated
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should set isAuthenticated to false when user is cleared', () => {
      useAuthStore.getState().setToken('test-token')
      useAuthStore.getState().setUser(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      useAuthStore.getState().setUser(null)
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('logout', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    it('should clear token, user, and isAuthenticated', () => {
      // First set up authenticated state
      useAuthStore.getState().setToken('test-token')
      useAuthStore.getState().setUser(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      // Then logout
      useAuthStore.getState().logout()
      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('Persistence', () => {
    it('should use correct storage key', () => {
      useAuthStore.getState().setToken('persistent-token')
      const stored = localStorage.getItem('enjoy-auth')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.state.token).toBe('persistent-token')
    })

    it('should persist user data', () => {
      const mockUser: User = {
        id: 'user-456',
        email: 'persist@example.com',
        name: 'Persist User',
      }
      useAuthStore.getState().setToken('token')
      useAuthStore.getState().setUser(mockUser)
      const stored = localStorage.getItem('enjoy-auth')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.state.user).toEqual(mockUser)
    })
  })

  // Note: Window event handler tests are complex because the handlers are
  // registered at module load time. These are better tested with integration tests.
})
