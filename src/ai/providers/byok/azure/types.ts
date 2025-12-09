/**
 * Azure Speech Types for BYOK
 * Type definitions for Azure Speech services with user-provided keys
 */

/**
 * Azure Speech configuration with user-provided subscription key
 * Users provide their own Azure Speech subscription credentials
 */
export interface AzureSpeechConfig {
  subscriptionKey: string
  region: string
}

