import type { Context, Next } from 'hono'
import { convertSnakeToCamel, createLogger } from '@/shared/lib/utils'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'Auth' })

// ============================================================================
// Constants
// ============================================================================

const PROFILE_API_PATH = '/api/v1/profile'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000 // 10 minutes

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Subscription tier type
 */
export type SubscriptionTier = 'free' | 'pro' | 'ultra'

/**
 * User profile in camelCase format (used internally in the app)
 */
export interface UserProfile {
	id: string
	email: string
	name: string
	avatarUrl: string
	subscriptionTier: SubscriptionTier
	subscriptionExpireDate: string
	createdAt: string
}

interface CacheEntry {
	profile: UserProfile
	expiresAt: number
}

// ============================================================================
// Cache Management
// ============================================================================

const profileCache = new Map<string, CacheEntry>()
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

// ============================================================================
// Token Extraction
// ============================================================================

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

// ============================================================================
// Utilities
// ============================================================================

/**
 * Validate subscription tier
 * @returns true if valid, false otherwise
 */
export function isValidSubscriptionTier(tier: unknown): tier is SubscriptionTier {
	return tier === 'free' || tier === 'pro' || tier === 'ultra'
}

/**
 * Validate user profile structure
 * @throws Error if profile is invalid
 */
export function validateUserProfile(profile: Partial<UserProfile>): asserts profile is UserProfile {
	if (!profile.id || !profile.email || !profile.name) {
		throw new Error('Invalid user profile: missing required fields')
	}

		if (!isValidSubscriptionTier(profile.subscriptionTier)) {
		throw new Error(
			`Invalid subscription tier: ${profile.subscriptionTier}. Expected 'free', 'pro', or 'ultra'.`
		)
	}
}

// ============================================================================
// Profile Fetching
// ============================================================================

/**
 * Fetch user profile from Rails API
 * Uses native fetch API (required for Cloudflare Workers)
 */
async function fetchUserProfile(
	accessToken: string,
	railsApiBaseUrl: string
): Promise<UserProfile> {
	const url = `${railsApiBaseUrl}${PROFILE_API_PATH}`
	log.debug(`Making request to: ${url}`)

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
	})

	log.debug(`Response status: ${response.status} ${response.statusText}`)

	if (!response.ok) {
		const errorText = await response.text().catch(() => 'No error details')
		log.error(`Profile fetch failed: ${response.status} ${response.statusText}`, errorText)
		if (response.status === 401) {
			throw new Error('Unauthorized: Invalid or expired access token')
		}
		throw new Error(
			`Failed to fetch user profile: ${response.status} ${response.statusText}`
		)
	}

	// Parse Rails API response (snake_case)
	const railsProfile = await response.json()
	log.debug(`Profile response received (raw):`, railsProfile)

	// Convert to camelCase format using shared utility
	const profile = convertSnakeToCamel<UserProfile>(railsProfile)
	log.debug(`Profile converted:`, {
		id: profile.id,
		email: profile.email,
		subscriptionTier: profile.subscriptionTier,
	})

	return profile
}

/**
 * Get user profile from cache or fetch from Rails API
 * Handles caching, validation, and error handling
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
		log.debug(`Using cached profile:`, {
			id: cached.profile.id,
			email: cached.profile.email,
			subscriptionTier: cached.profile.subscriptionTier,
		})
		// Validate cached profile
		if (!isValidSubscriptionTier(cached.profile.subscriptionTier)) {
			log.warn(`Invalid subscription tier in cached profile, fetching fresh profile`)
			// Remove invalid cache entry and fetch fresh
			profileCache.delete(accessToken)
		} else {
			return cached.profile
		}
	}

	// Fetch from Rails API
	log.debug(`Fetching user profile from: ${railsApiBaseUrl}${PROFILE_API_PATH}`)
	const profile = await fetchUserProfile(accessToken, railsApiBaseUrl)
	log.debug(`Profile fetched:`, {
		id: profile.id,
		email: profile.email,
		subscriptionTier: profile.subscriptionTier,
	})

	// Validate profile structure
	try {
		validateUserProfile(profile)
	} catch (error) {
		log.error('Invalid profile structure:', error, profile)
		throw error
	}

	// Cache the profile
	profileCache.set(accessToken, {
		profile,
		expiresAt: Date.now() + CACHE_TTL_MS,
	})

	return profile
}

// ============================================================================
// Middleware
// ============================================================================

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
		return c.json(
			{
				error: 'Missing access token',
				message: 'Please sign in to continue',
				reason: 'unauthorized',
			},
			401
		)
	}

	try {
		// Get Rails API base URL from environment or use default
		const railsApiBaseUrl =
			(c.env as any).API_BASE_URL

		// Get user profile (from cache or API)
		const profile = await getUserProfile(accessToken, railsApiBaseUrl)

		// Attach user profile to context
		c.set('user', profile)

		// Continue to next middleware/route handler
		await next()
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Authentication failed'
		return c.json(
			{
				error: errorMessage,
				message: 'Please sign in to continue',
				reason: 'unauthorized',
			},
			401
		)
	}
}

