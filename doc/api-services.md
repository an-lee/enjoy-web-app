# API Services

## Overview

The project uses **two API systems** with clear responsibility separation:

1. **Rails API Backend** (`src/api/`): **User information management** - authentication, user profiles, and data synchronization
2. **Hono API Worker** (`src/server/api.ts`): **All AI services** - translation, dictionary, ASR, TTS, assessment, and other AI-powered features

This document focuses on the **Rails API Backend** client. For AI services via Hono API Worker, see [API Worker Integration Guide](./api-worker-integration.md) and [AI Service Architecture](./ai-services.md).

## API Systems Comparison

| Feature | Rails API Backend | Hono API Worker |
|---------|------------------|-----------------|
| **Location** | External server (`https://enjoy.bot`) | Cloudflare Worker (same domain) |
| **Route Prefix** | `/api/v1/*` | `/api/*` |
| **Primary Responsibility** | **User information management** | **All AI services** |
| **Services** | Auth, user profiles, data sync | Translation, dictionary, ASR, TTS, assessment |
| **Client Module** | `src/api/` | Direct fetch calls or service wrappers |
| **Authentication** | Bearer token (JWT) | Can use same JWT or Cloudflare-specific auth |
| **Bindings** | N/A | KV, D1, AI, R2, etc. |
| **AI Integration** | ❌ No AI services | ✅ Direct Cloudflare Workers AI access |

## Rails API Backend

The API Services module provides a clean, typed interface for interacting with the Enjoy API backend. It handles authentication, request/response formatting, and error handling in a unified way.

## Architecture

### API Client

The `apiClient` is a configured Axios instance that:

- **Base Configuration**: Uses `API_BASE_URL` environment variable (defaults to `https://enjoy.bot`)
- **Authentication**: Automatically adds Bearer token from auth store to all requests
- **Error Handling**: Handles 401 errors by clearing auth state and dispatching `auth:unauthorized` event
- **Timeout**: 30-second timeout for all requests

### Service Modules

Each API service is a self-contained module exporting typed functions:

- **Auth API** (`auth.ts`): User authentication endpoints (login, logout, token refresh)
- **User API** (`user.ts`): User profile and account endpoints (get profile, update profile)

> **Note**: Translation and Dictionary services have been moved to Hono API Worker. See [API Worker Integration Guide](./api-worker-integration.md) for AI services.

## Service Overview

### Authentication & User Services

**Purpose**: User account management and authentication

**Endpoints**:

- `POST /api/v1/auth/login`: User login
- `POST /api/v1/auth/logout`: User logout
- `POST /api/v1/auth/refresh`: Refresh authentication token
- `GET /api/v1/profile`: Get current user profile
- `PUT /api/v1/profile`: Update user profile
- `POST /api/v1/sync`: Data synchronization endpoints

**Characteristics**:

- All endpoints require authentication (Bearer token)
- Handles user session management
- Manages data synchronization between client and server
- Uses PostgreSQL for persistent storage
- Uses Redis for session/cache management

These endpoints use the authenticated `apiClient` instance, which automatically includes the Bearer token.

> **Note**: All AI services (translation, dictionary, ASR, TTS, assessment) are now handled by Hono API Worker. See [API Worker Integration Guide](./api-worker-integration.md).

## API Systems Overview

### Rails API Services (This Module) - User Information Management

**Responsibility**: User account and data management

- **Authentication**: Login, logout, token management
- **User Profiles**: Get/update user information
- **Data Synchronization**: Sync local data with server (PostgreSQL)

**Characteristics**:

- Always use Enjoy API backend (`https://enjoy.bot`)
- Requires authentication (Bearer token)
- Uses PostgreSQL for persistent storage
- Uses Redis for caching/sessions
- External service (separate server)

### Hono API Worker (`src/server/api.ts`) - All AI Services

**Responsibility**: All AI-powered features

- **Translation Services**: Fast translation, smart translation (style-aware)
- **Dictionary Services**: Basic dictionary, smart dictionary (contextual)
- **Speech Services**: ASR (Automatic Speech Recognition), TTS (Text-to-Speech)
- **Assessment**: Pronunciation evaluation
- **OpenAI-Compatible API**: Chat completions and TTS using Cloudflare Workers AI (see [OpenAI API Guide](../README-openai-api.md))

**Characteristics**:

- Same domain as frontend (no CORS issues)
- Direct access to Cloudflare Workers AI
- Access to Cloudflare Bindings (KV, D1, R2)
- Edge computing (low latency, global network)
- Serverless (no server maintenance)
- Can use Cloudflare AI or route to external providers
- OpenAI-compatible endpoints for easy integration

**Usage**: See [API Worker Integration Guide](./api-worker-integration.md), [AI Service Architecture](./ai-services.md), and [OpenAI API Guide](../README-openai-api.md)

### AI Service Client (`@/ai`)

The frontend AI service client (`src/ai/`) provides:

- **Unified Interface**: Provider-agnostic service layer
- **Multiple Providers**: Support for Enjoy, Local, BYOK
- **Service Routers**: High-level APIs for all AI services

**Note**: The client layer calls Hono API Worker endpoints, which then handle the actual AI processing.

## Response Format

All API services return a consistent response format:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
```

## Error Handling

The API client handles errors at two levels:

1. **Client-level**: Axios interceptors handle 401 errors globally
2. **Service-level**: Each service wraps requests in try-catch and returns standardized error responses

## Usage Pattern

```typescript
import { authApi, userApi } from '@/api'

// Authentication
const loginResult = await authApi.login({
  email: 'user@example.com',
  password: 'password'
})

// Get user profile
const profile = await userApi.getProfile()

// Update user profile
await userApi.updateProfile({
  name: 'New Name',
  preferences: { ... }
})
```

> **Note**: For AI services (translation, dictionary, ASR, TTS), use the AI Service Client (`@/ai`) which calls Hono API Worker endpoints.

## Environment Configuration

The API base URL is configured via environment variable:

- **Environment Variable**: `API_BASE_URL`
- **Default**: `https://enjoy.bot`
- **Usage**: Set in `.env` or deployment configuration

## When to Use Which API

### Use Rails API Backend (`src/api/`) when
- ✅ **User authentication** (login, logout, token refresh)
- ✅ **User profile management** (get/update profile)
- ✅ **Data synchronization** (sync local data with server)
- ✅ **Access to PostgreSQL/Redis/S3** (backend storage)

### Use Hono API Worker (`/api/*`) when
- ✅ **All AI services** (translation, dictionary, ASR, TTS, assessment)
- ✅ **OpenAI-compatible API** (chat completions, TTS with Cloudflare Workers AI)
- ✅ **Cloudflare Workers AI** (direct access to AI models)
- ✅ **Edge computing** (low latency, global network)
- ✅ **Cloudflare Bindings** (KV, D1, R2 for caching/storage)
- ✅ **Same-domain API** (no CORS issues)

### Use AI Service Client (`@/ai`) when
- ✅ **Frontend integration** (unified interface for AI services)
- ✅ **Provider abstraction** (Enjoy, Local, BYOK support)
- ✅ **Type-safe API calls** (TypeScript interfaces)

**Note**: The AI Service Client calls Hono API Worker endpoints, which handle the actual AI processing.

## Best Practices

1. **Always use service modules** - don't call `apiClient` directly
2. **Handle response structure** - check `success` flag before accessing `data`
3. **Use typed interfaces** - leverage TypeScript types for request/response
4. **Let interceptors handle auth** - don't manually add tokens
5. **Clear responsibility separation**:
   - **Rails API**: User information management only
   - **Hono API**: All AI services
6. **Use AI Service Client** (`@/ai`) for AI features - it calls Hono API Worker internally
