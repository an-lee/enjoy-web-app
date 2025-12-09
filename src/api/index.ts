export { apiClient } from './client'
export { authApi } from './auth'
export { translationApi } from './translation'
export { dictionaryApi } from './dictionary'

// Legacy API object for backward compatibility during migration
import { authApi } from './auth'

export const api = {
  auth: authApi,
}

