import type { Context, Next } from 'hono'

// User profile type matching the Rails API response
export interface UserProfile {
	id: string
	email: string
	name: string
	avatarUrl: string
	subscriptionTier: 'free' | 'pro'
	subscriptionExpireDate: string
	createdAt: string
}

// Cache entry with expiration timestamp
interface CacheEntry {
	profile: UserProfile
	expiresAt: number
}

// In-memory cache for user profiles
// Key: accessToken, Value: CacheEntry
const profileCache = new Map<string, CacheEntry>()

// Cache TTL: 5 minutes in milliseconds
const CACHE_TTL_MS = 5 * 60 * 1000

// Clean up expired entries periodically (every 10 minutes)
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
	const now = Date.now()
	if (now - lastCleanup < CACHE_CLEANUP_INTERVAL) {
		return
	}

	for (const [token, entry] of profileCache.entries()) {
		if (entry.expiresAt < now) {
			profileCache.delete(token)
		}
	}

	lastCleanup = now
}

/**
 * Get access token from request headers
 * Supports both Authorization: Bearer <token> and custom accessToken header
 */
function getAccessToken(c: Context): string | null {
	// Try Authorization header first (Bearer token)
	const authHeader = c.req.header('Authorization')
	if (authHeader) {
		const match = authHeader.match(/^Bearer\s+(.+)$/i)
		if (match) {
			return match[1]
		}
	}

	// Try custom accessToken header
	const accessToken = c.req.header('accessToken')
	if (accessToken) {
		return accessToken
	}

	return null
}

/**
 * Fetch user profile from Rails API
 */
async function fetchUserProfile(
	accessToken: string,
	railsApiBaseUrl: string
): Promise<UserProfile> {
	const url = `${railsApiBaseUrl}/api/v1/profile`
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
	})

	if (!response.ok) {
		if (response.status === 401) {
			throw new Error('Unauthorized: Invalid or expired access token')
		}
		throw new Error(
			`Failed to fetch user profile: ${response.status} ${response.statusText}`
		)
	}

	const profile = await response.json<UserProfile>()
	return profile
}

/**
 * Get user profile from cache or fetch from Rails API
 */
async function getUserProfile(
	accessToken: string,
	railsApiBaseUrl: string
): Promise<UserProfile> {
	// Clean up expired entries periodically
	cleanupExpiredEntries()

	// Check cache first
	const cached = profileCache.get(accessToken)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.profile
	}

	// Fetch from Rails API
	const profile = await fetchUserProfile(accessToken, railsApiBaseUrl)

	// Cache the profile
	profileCache.set(accessToken, {
		profile,
		expiresAt: Date.now() + CACHE_TTL_MS,
	})

	return profile
}

/**
 * Authentication middleware for Hono
 *
 * This middleware:
 * 1. Extracts accessToken from request headers
 * 2. Fetches user profile from Rails API /api/v1/profile
 * 3. Caches the profile for 5 minutes
 * 4. Attaches the profile to the context for use in route handlers
 *
 * Usage:
 * ```ts
 * import { authMiddleware } from './middleware/auth'
 *
 * api.use('/protected/*', authMiddleware)
 *
 * api.get('/protected/user', (c) => {
 *   const user = c.get('user')
 *   return c.json(user)
 * })
 * ```
 */
export async function authMiddleware(
	c: Context<{ Bindings: Env; Variables: { user: UserProfile } }>,
	next: Next
) {
	// Get access token from headers
	const accessToken = getAccessToken(c)

	if (!accessToken) {
		return c.json({ error: 'Missing access token' }, 401)
	}

	try {
		// Get Rails API base URL from environment or use default
		const railsApiBaseUrl =
			(c.env as any).RAILS_API_BASE_URL ||
			(c.env as any).VITE_API_BASE_URL ||
			'https://enjoy.bot'

		// Get user profile (from cache or API)
		const profile = await getUserProfile(accessToken, railsApiBaseUrl)

		// Attach user profile to context
		c.set('user', profile)

		// Continue to next middleware/route handler
		await next()
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Authentication failed'
		return c.json({ error: errorMessage }, 401)
	}
}

