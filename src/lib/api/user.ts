import { apiClient } from './client'

export const userApi = {
  profile: () => apiClient.get('/api/profile'),
}

