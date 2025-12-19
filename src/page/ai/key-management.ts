/**
 * User API Key Management (BYOK - Bring Your Own Key)
 * Not implemented yet, but interface is reserved for future use
 */

export interface UserAPIKeys {
  openai?: string
  azure?: {
    subscriptionKey: string
    region: string
  }
  // Keys for other service providers...
}

/**
 * Key Management Service
 */
export const keyManagementService = {
  /**
   * Save user API keys (future implementation)
   */
  async saveKeys(_keys: UserAPIKeys): Promise<void> {
    // Future implementation: Call Enjoy API to save encrypted keys
    throw new Error('BYOK not implemented yet')
  },

  /**
   * Get user API keys (future implementation)
   */
  async getKeys(): Promise<UserAPIKeys | null> {
    // Future implementation: Get keys from Enjoy API
    throw new Error('BYOK not implemented yet')
  },

  /**
   * Delete user API keys (future implementation)
   */
  async deleteKeys(): Promise<void> {
    // Future implementation: Delete keys
    throw new Error('BYOK not implemented yet')
  },
}

