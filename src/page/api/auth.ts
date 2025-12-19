// ============================================================================
// Types & Exports
// ============================================================================

import { apiClient } from "./client"

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

/**
 * User profile response type
 * Alias for UserProfile
 */
export type AuthProfileResponse = UserProfile

// ============================================================================
// Constants
// ============================================================================

const PROFILE_API_PATH = '/api/v1/profile'

// ============================================================================
// Client-side API Methods
// ============================================================================

export const authApi = {
  /**
   * Get current user profile from Rails API
   *
   * Client-side only. Response is automatically converted from snake_case to camelCase
   * by the API client interceptor.
   *
   * @returns User profile in camelCase format
   */
  profile: async () => {
    return apiClient.get<UserProfile>(PROFILE_API_PATH)
  },
}

