/**
 * Environment variable types for Cloudflare Workers
 * Extends the base Env interface from worker-configuration.d.ts
 */

declare namespace Cloudflare {
	interface Env {
		// Azure Speech Service configuration
		AZURE_SPEECH_SUBSCRIPTION_KEY?: string
		AZURE_SPEECH_SUBSCRIPTION_KEY_SECRET?: string // Alternative name for secret
		AZURE_SPEECH_REGION?: string
		AZURE_SPEECH_SERVICE_REGION?: string // Alternative name for region

		// Rate limiting KV namespace (optional but recommended)
		RATE_LIMIT_KV?: KVNamespace

		// Rails API base URL (for authentication)
		RAILS_API_BASE_URL?: string
		VITE_API_BASE_URL?: string
	}
}
