import { apiClient } from './client'

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
}

export interface AuthProfileResponse {
  id: string
  email: string
  name: string
  avatarUrl: string
  subscriptionTier: SubscriptionTier
  subscriptionExpireDate: string
  createdAt: string
}

export const authApi = {
  // Get current user profile
  profile: () => apiClient.get<AuthProfileResponse>('/api/v1/profile'),
}

