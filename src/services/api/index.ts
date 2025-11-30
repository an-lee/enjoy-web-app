export { apiClient } from './client'
export { authApi } from './auth'
export { userApi } from './user'
export { translationApi } from './translation'
export { dictionaryApi } from './dictionary'

// Legacy API object for backward compatibility during migration
import { authApi } from './auth'
import { userApi } from './user'

export const api = {
  auth: authApi,
  user: userApi,
}

