# API Services

## Overview

The API Services module provides a clean, typed interface for interacting with the Enjoy API backend. It handles authentication, request/response formatting, and error handling in a unified way.

## Architecture

### API Client

The `apiClient` is a configured Axios instance that:

- **Base Configuration**: Uses `VITE_API_BASE_URL` environment variable (defaults to `https://echo.enjoy.bot`)
- **Authentication**: Automatically adds Bearer token from auth store to all requests
- **Error Handling**: Handles 401 errors by clearing auth state and dispatching `auth:unauthorized` event
- **Timeout**: 30-second timeout for all requests

### Service Modules

Each API service is a self-contained module exporting typed functions:

- **Auth API** (`auth.ts`): User authentication endpoints
- **User API** (`user.ts`): User profile and account endpoints
- **Translation API** (`translation.ts`): Fast translation service (FREE)
- **Dictionary API** (`dictionary.ts`): Basic dictionary lookup (FREE)

## Service Overview

### Fast Translation

**Purpose**: Quick subtitle translation using dedicated translation models (M2M100, NLLB)

**Characteristics**:

- **FREE** service - always available
- Optimized for speed and low cost
- Direct translation without style support
- Not an AI service - uses dedicated translation models

**Endpoint**: `POST /api/v1/services/fast-translation`

**Usage**: Ideal for subtitle translation where style is not important.

### Basic Dictionary Lookup

**Purpose**: Simple word definitions without AI

**Characteristics**:

- **FREE** service - always available
- Returns definitions, translations, and part of speech
- No context awareness - simple word lookup
- Not an AI service - uses traditional dictionary data

**Endpoint**: `POST /api/v1/services/dictionary/basic`

**Usage**: Quick word lookups when context is not needed.

### Authentication & User Services

**Endpoints**:

- `GET /api/profile`: Get current user profile

These endpoints use the authenticated `apiClient` instance, which automatically includes the Bearer token.

## API vs AI Services

### API Services (This Module)

- **Fast Translation**: Simple, fast translation (FREE)
- **Basic Dictionary**: Word definitions without AI (FREE)
- **Auth/User**: Authentication and user management

**Characteristics**:

- Always use Enjoy API backend
- No provider selection needed
- No configuration required
- Simple REST API calls

### AI Services (`@/services/ai`)

- **Smart Translation**: Style-aware translation with LLMs
- **Contextual Dictionary**: AI-powered contextual explanations
- **ASR/TTS**: Speech recognition and synthesis
- **Assessment**: Pronunciation evaluation

**Characteristics**:

- Multiple provider support (Enjoy, Local, BYOK)
- Configuration required
- Unified response format with metadata
- More complex routing and error handling

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
import { translationApi, dictionaryApi } from '@/services/api'

// Fast translation
const result = await translationApi.translate({
  sourceText: 'Hello world',
  sourceLanguage: 'en',
  targetLanguage: 'zh'
})

// Basic dictionary lookup
const dictResult = await dictionaryApi.lookupBasic({
  word: 'hello',
  sourceLanguage: 'en',
  targetLanguage: 'zh'
})
```

## Environment Configuration

The API base URL is configured via environment variable:

- **Environment Variable**: `VITE_API_BASE_URL`
- **Default**: `https://echo.enjoy.bot`
- **Usage**: Set in `.env` or deployment configuration

## Best Practices

1. **Always use service modules** - don't call `apiClient` directly
2. **Handle response structure** - check `success` flag before accessing `data`
3. **Use typed interfaces** - leverage TypeScript types for request/response
4. **Let interceptors handle auth** - don't manually add tokens
5. **Prefer AI services** for contextual features - use API services only for simple, free operations
