/**
 * AI Service Configuration Constants
 * Essential configuration values used across AI services
 *
 * Note: Most service-specific constants are now defined closer to where
 * they're used (e.g., in client.ts, provider implementations, etc.)
 */

// ============================================================================
// Azure Speech Configuration
// ============================================================================

/**
 * Default Azure region for Speech Services
 * Used when BYOK users don't specify a region
 */
export const DEFAULT_AZURE_REGION = 'eastus'
