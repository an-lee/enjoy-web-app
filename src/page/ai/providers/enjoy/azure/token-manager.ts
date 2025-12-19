/**
 * Azure Speech Token Manager
 * Handles token acquisition and caching from /api/azure/tokens
 *
 * Azure Speech tokens are valid for 10 minutes.
 * This manager caches tokens and refreshes them before expiration.
 */

import { useAuthStore } from '@/page/stores/auth'

// Token cache duration (9 minutes to allow buffer before 10-minute expiration)
const TOKEN_CACHE_DURATION_MS = 9 * 60 * 1000

// API endpoint for Azure token generation
const AZURE_TOKEN_ENDPOINT = '/api/azure/tokens'

/**
 * Azure token response from server
 */
export interface AzureTokenResponse {
  token: string
  region: string
  expiresAt: number
}

/**
 * Cached token state
 */
interface TokenCache {
  token: string
  region: string
  expiresAt: number
  fetchedAt: number
}

// In-memory token cache
let tokenCache: TokenCache | null = null

/**
 * Check if cached token is still valid
 */
function isTokenValid(): boolean {
  if (!tokenCache) return false

  const now = Date.now()
  const tokenAge = now - tokenCache.fetchedAt

  // Token is valid if it's less than 9 minutes old
  return tokenAge < TOKEN_CACHE_DURATION_MS
}

/**
 * Get Azure Speech token
 * Returns cached token if valid, otherwise fetches a new one
 *
 * @returns Token and region for Azure Speech SDK
 * @throws Error if token acquisition fails
 */
export async function getAzureToken(): Promise<{
  token: string
  region: string
}> {
  // Return cached token if valid
  if (isTokenValid() && tokenCache) {
    return {
      token: tokenCache.token,
      region: tokenCache.region,
    }
  }

  // Fetch new token
  const authToken = useAuthStore.getState().token

  if (!authToken) {
    throw new Error('Authentication required for Azure Speech services')
  }

  const response = await fetch(AZURE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      error?: string
    }
    throw new Error(error.error || `Failed to get Azure token: ${response.status}`)
  }

  const data = (await response.json()) as AzureTokenResponse

  // Cache the token
  tokenCache = {
    token: data.token,
    region: data.region,
    expiresAt: data.expiresAt,
    fetchedAt: Date.now(),
  }

  return {
    token: data.token,
    region: data.region,
  }
}

/**
 * Clear cached token
 * Call this when user logs out or token becomes invalid
 */
export function clearAzureTokenCache(): void {
  tokenCache = null
}

/**
 * Check if Azure Speech is available
 * This checks if user is authenticated and has access to Azure Speech services
 */
export function isAzureSpeechAvailable(): boolean {
  const authToken = useAuthStore.getState().token
  return !!authToken
}

