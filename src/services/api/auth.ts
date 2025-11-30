import { apiClient } from './client'

export const authApi = {
  // Get current user profile
  profile: () => apiClient.get('/api/profile'),
}

