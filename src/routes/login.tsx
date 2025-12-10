import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { useAuthStore, type User } from '@/stores'
import { authApi } from '@/api'
import { createLogger } from '@/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'Login' })

// ============================================================================
// Constants
// ============================================================================

// Storage key for CSRF state
const AUTH_STATE_KEY = 'enjoy_auth_state'

/**
 * Generate a random state string for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return `ENJOYWEBAPP${Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Parse fragment parameters from URL hash
 * Example: #access_token=xxx&state=yyy -> { access_token: 'xxx', state: 'yyy' }
 */
function parseFragmentParams(hash: string): Record<string, string> {
  if (!hash || hash.length <= 1) return {}

  const fragment = hash.startsWith('#') ? hash.substring(1) : hash
  const params = new URLSearchParams(fragment)
  const result: Record<string, string> = {}

  params.forEach((value, key) => {
    result[key] = value
  })

  return result
}

/**
 * Get redirect URL from search params (SSR-safe)
 */
function getRedirectUrl(routeRedirect: string | undefined): string {
  // Check route search param first
  if (routeRedirect) return routeRedirect

  // Check URL search params (only on client)
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search)
    const redirectUrl = searchParams.get('redirect_url')
    if (redirectUrl) return redirectUrl
  }

  return '/'
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    }
  },
  component: LoginPage,
})

/**
 * Check if current URL has a callback token (SSR-safe)
 */
function hasCallbackToken(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash
  if (!hash) return false
  const params = parseFragmentParams(hash)
  return !!(params.access_token || params.token)
}

function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, setToken, setUser } = useAuthStore()
  const search = Route.useSearch()
  // Initialize with true if we detect a callback token, to show spinner immediately
  const [isProcessingCallback, setIsProcessingCallback] = useState(hasCallbackToken)

  // Handle fragment token on page load (callback from main site)
  useEffect(() => {
    const hash = window.location.hash
    log.debug('Checking hash:', hash)

    if (!hash) {
      log.debug('No hash found')
      return
    }

    const params = parseFragmentParams(hash)
    log.debug('Parsed params:', params)

    const token = params.access_token || params.token
    const returnedState = params.state

    // Clear the hash from URL immediately for security
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    )

    if (!token) {
      log.debug('No token in hash')
      return
    }

    // Mark that we're processing a callback
    setIsProcessingCallback(true)

    // Verify state for CSRF protection (skip in development if no stored state)
    const storedState = sessionStorage.getItem(AUTH_STATE_KEY)
    log.debug('State check - returned:', returnedState, 'stored:', storedState)
    sessionStorage.removeItem(AUTH_STATE_KEY)

    // Only enforce state check if we have both states
    if (returnedState && storedState && returnedState !== storedState) {
      log.error('State mismatch - possible CSRF attack')
      setIsProcessingCallback(false)
      return
    }

    // Process the token
    const processToken = async () => {
      log.info('Processing token...')
      setToken(token)

      // Fetch user profile
      try {
        const profileResponse = await authApi.profile()
        log.info('Profile fetched:', profileResponse.data)
        setUser(profileResponse.data as User)
      } catch (err) {
        log.error('Failed to fetch user profile:', err)
        // Continue even if profile fetch fails
      }

      // Navigate to the redirect destination
      const redirectTo = getRedirectUrl(search.redirect)
      log.info('Navigating to:', redirectTo)

      // Use replace to prevent back button issues
      navigate({
        to: redirectTo as Parameters<typeof navigate>[0]['to'],
        replace: true,
      })
    }

    processToken()
  }, []) // Empty deps - only run once on mount

  // Redirect if already authenticated (but not if processing callback)
  useEffect(() => {
    if (isAuthenticated && !isProcessingCallback) {
      log.info('Already authenticated, redirecting...')
      const redirectTo = getRedirectUrl(search.redirect)
      navigate({
        to: redirectTo as Parameters<typeof navigate>[0]['to'],
        replace: true,
      })
    }
  }, [isAuthenticated, isProcessingCallback, navigate, search.redirect])

  // Handle login button click - redirect to main site
  const handleLogin = () => {
    const MAIN_SITE_URL =
      import.meta.env.VITE_MAIN_SITE_URL || 'https://enjoy.bot'

    // Generate and store state for CSRF protection
    const state = generateState()
    sessionStorage.setItem(AUTH_STATE_KEY, state)
    log.debug('Generated state:', state)

    // Build the callback URL
    const callbackUrl = new URL(window.location.origin + '/login')
    const finalRedirect = getRedirectUrl(search.redirect)
    if (finalRedirect && finalRedirect !== '/') {
      callbackUrl.searchParams.set('redirect_url', finalRedirect)
    }

    // Build the main site login URL with parameters
    const loginUrl = new URL(`${MAIN_SITE_URL}/login`)
    loginUrl.searchParams.set('return_to', callbackUrl.toString())
    loginUrl.searchParams.set('state', state)

    log.info('Redirecting to:', loginUrl.toString())

    // Redirect to main site
    window.location.href = loginUrl.toString()
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-zinc-950">
      {/* Mesh gradient background */}
      <div className="pointer-events-none absolute inset-0">
        {/* Primary gradient orb */}
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        {/* Secondary gradient orb */}
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-500/15 blur-[100px]" />
        {/* Accent gradient orb */}
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[80px]" />
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')] opacity-[0.03]" />
      </div>

      {isProcessingCallback ? (
        /* Loading spinner during callback processing */
        <div className="relative flex h-40 w-40 items-center justify-center">
          {/* Rotating border gradient */}
          <span className="absolute inset-0 animate-spin rounded-full bg-linear-to-r from-violet-500 via-fuchsia-500 to-cyan-500 p-[2px] animation-duration-[2s]">
            <span className="flex h-full w-full rounded-full bg-zinc-950" />
          </span>

          {/* Inner background */}
          <span className="absolute inset-[2px] rounded-full bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800" />

          {/* Spinner icon */}
          <Icon
            icon="lucide:loader-2"
            className="relative z-10 h-10 w-10 animate-spin text-zinc-400"
          />
        </div>
      ) : (
        /* Circular login button */
        <button
          onClick={handleLogin}
          className="group relative flex h-40 w-40 cursor-pointer items-center justify-center"
        >
          {/* Outer glow ring */}
          <span className="absolute inset-0 rounded-full bg-linear-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

          {/* Rotating border gradient */}
          <span className="absolute inset-0 rounded-full bg-linear-to-r from-violet-500 via-fuchsia-500 to-cyan-500 p-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex h-full w-full rounded-full bg-zinc-950" />
          </span>

          {/* Inner gradient background */}
          <span className="absolute inset-[2px] rounded-full bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 transition-all duration-300 group-hover:from-zinc-800 group-hover:via-zinc-900 group-hover:to-zinc-900" />

          {/* Button content */}
          <span className="relative z-10 flex flex-col items-center gap-2 text-zinc-100 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
            <Icon
              icon="lucide:play"
              className="h-10 w-10 translate-x-0.5 fill-current"
            />
            <span className="text-sm font-medium tracking-wider opacity-80">
              ENJOY
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
