# API & AI Services

## 1. Backend API (Rails) - Enjoy API

The Enjoy API is our project's cloud service backend. It serves as the interface between the client and various AI providers, following **OpenAI-compatible API specifications**. It handles authentication, rate limiting, quota management, and standardizing responses across different providers.

### Authentication

The web app uses OAuth authentication, which is initiated by the browser extension:
1. Extension opens webapp login page: `/login?state={state}&locale={locale}`
2. Webapp handles OAuth flow with backend
3. On success, webapp sends `ENJOY_ECHO_AUTH_SUCCESS` message to extension via `postMessage`
4. Extension validates token and stores it

**Auth Endpoints:**
- `POST /api/v1/auth/oauth/callback`: OAuth callback handler (if needed)
- `GET /api/v1/user/profile`: Get current user profile

### Key Endpoints

 - `POST /api/v1/materials`: Create metadata for new material.
 - `POST /api/v1/materials/:id/upload`: Get presigned URL for media upload.
 - `POST /api/v1/sync`: Batch synchronization endpoint for progress and vocabulary.

### AI Service Endpoints

- `POST /api/v1/services/translation`: Smart translation with style support.
- `POST /api/v1/services/tts`: Text-to-speech synthesis.
- `POST /api/v1/services/asr`: Automatic speech recognition.
- `POST /api/v1/services/dictionary`: Contextual word lookup.
- `POST /api/v1/services/assessment`: Submit audio for pronunciation scoring.
- `GET /api/v1/services/azure-speech/token`: Get Azure Speech token (for non-BYOK usage).

## 2. AI Service Integration

The Enjoy API follows **OpenAI-compatible specifications**, making it easy to integrate and switch between providers. It acts as a proxy to hide keys and manage quotas. All AI services support multiple providers and BYOK (Bring Your Own Key) for future extensibility.

### Service Provider Modes

AI services support different provider modes depending on the service:

1. **`enjoy`** (default): Uses Enjoy API managed services
   - OpenAI-compatible API interface (except for Fast Translation and Basic Dictionary)
   - Centralized authentication and quota management
   - **Free services**: Fast Translation, Basic Dictionary Lookup
   - **AI services with quotas**: Smart Translation, ASR, TTS, Contextual Dictionary, Pronunciation Assessment

2. **`local`**: Uses browser-local transformers.js models (free, offline-capable)
   - Runs entirely in browser using Web Workers
   - No API calls, completely offline
   - Uses the same prompt templates as cloud services
   - **Supported**: Smart Translation, ASR, TTS, Dictionary (contextual)
   - **Not supported**: Fast Translation (always uses Enjoy API), Basic Dictionary, Assessment

3. **`byok`**: Uses user-provided API keys (FUTURE - interface reserved)
   - **Planned support**: OpenAI, Google (Gemini), Claude (Anthropic), Azure, Custom OpenAI-compatible endpoints
   - Provider adapters handle API differences
   - Uses the same prompt templates as other providers
   - **Supported**: Smart Translation, ASR, TTS, Dictionary (contextual), Assessment (Azure only)
   - **Not supported**: Fast Translation, Basic Dictionary (always free via Enjoy API)

### Service-Provider Matrix

| Service | Enjoy | Local | BYOK (Future) |
|---------|-------|-------|---------------|
| Fast Translation | ✅ (FREE) | ❌ | ❌ |
| Smart Translation | ✅ (quota) | ✅ | ✅ |
| Dictionary (basic) | ✅ (FREE) | ❌ | ❌ |
| Dictionary (contextual) | ✅ (quota) | ✅ | ✅ |
| ASR | ✅ (quota) | ✅ | ✅ |
| TTS | ✅ (quota) | ✅ | ✅ |
| Assessment | ✅ (quota, Azure) | ❌ | ✅ (Azure only) |

**Key:**
- **FREE**: Always available without configuration
- **quota**: Requires Enjoy account with quota
- **✅**: Supported
- **❌**: Not supported

### A. Fast Translation

- **Purpose**: Quick subtitle translation using dedicated translation models
- **Cost**: **FREE** - Always provided by Enjoy API
- **Models**: Dedicated translation models (M2M100, NLLB)
- **Providers**: Enjoy API only (no local/BYOK options)
- **Features**:
  - Optimized for speed and low cost
  - Direct translation without style support
  - Ideal for subtitle translation
- **Request Format**:

    ```json
    {
      "sourceText": "Hello world",
      "sourceLanguage": "en",
      "targetLanguage": "zh"
    }
    ```

**Note**: Fast translation is always free and does not require AI service configuration. Use Smart Translation if you need style control or BYOK.

### B. Smart Translation
          "apiKey": "your-api-key",
          "endpoint": "optional-custom-endpoint",
          "model": "optional-model-name"
        }
      }
    }
    ```

### E. Text-to-Speech (TTS)

- **Purpose**: Generate audio for shadowing practice materials
- **Providers**:
  - **Enjoy API**: OpenAI-compatible API
  - **Local**: Web Speech API or transformers.js TTS models
  - **BYOK** (FUTURE): OpenAI, Azure, or custom endpoints
- **Features**:
  - Multiple voice options
  - Language-specific voices
  - High-quality neural voices
- **Request Format**:

    ```json
    {
      "text": "Hello world",
      "language": "en",
      "voice": "optional voice name",
      "provider": "openai" | "azure",
      "config": {
        "provider": "enjoy" | "local" | "byok",
        "byok": {
          "provider": "openai" | "azure",
          "apiKey": "your-api-key",
          "endpoint": "optional-custom-endpoint"
        }
      }
    }
    ```

### D. Automatic Speech Recognition (ASR)

- **Purpose**: Generate timestamped subtitles from audio/video content
- **Primary Model**: Whisper
- **Providers**:
  - **Enjoy API**: OpenAI-compatible API (Whisper)
  - **Local**: Browser-based transformers.js Whisper models (offline)
  - **BYOK** (FUTURE): OpenAI, Azure, or custom endpoints
- **Features**:
  - Multi-language support
  - Timestamped segments
  - Language detection
  - Prompt-based context hints
- **Request Format**:

    ```multipart/form-data
    audio: Blob
    language: string (optional)
    prompt: string (optional)
    provider: "openai" | "azure" | "local"
    config: JSON string {
      "provider": "enjoy" | "local" | "byok",
      "byok": {
        "provider": "openai" | "azure",
        "apiKey": "your-api-key"
      }
    }
    ```

### C. Dictionary Lookup

- **Purpose**: Word definitions and contextual explanations
- **Two-Tier Service**:
  1. **Basic Lookup** (FREE): Simple word definitions without AI
     - Always provided by Enjoy API
     - No configuration needed
     - Returns: definitions, translations, part of speech
  2. **Contextual Explanation** (AI): Context-aware detailed analysis
     - Requires AI configuration (enjoy/local/byok)
     - Uses LLM to generate contextual explanations
     - Same principle as smart translation
- **Providers** (for contextual explanation):
  - **Enjoy API**: OpenAI-compatible API using LLM services
  - **Local**: Browser-based transformers.js (may have limited capabilities)
  - **BYOK** (FUTURE): OpenAI, Google Gemini, Claude, Azure, or custom endpoints
- **Features**:
  - Contextual word definitions
  - Translation with context explanation
  - Part-of-speech tagging
  - Example sentences
  - **Unified prompts**: Same prompt templates used across all providers
- **Request Format**:

    ```json
    // Basic lookup (FREE)
    {
      "word": "ephemeral",
      "sourceLanguage": "en",
      "targetLanguage": "zh"
    }

    // Contextual explanation (with AI)
    {
      "word": "ephemeral",
      "context": "The beauty of this moment is ephemeral.",
      "sourceLanguage": "en",
      "targetLanguage": "zh",
      "config": {
        "provider": "enjoy" | "local" | "byok",
        "byok": { /* BYOK config */ }
      }
    }
    ```

- **Caching**: Results are cached in Redis to prevent re-generation for identical context queries.

### F. Pronunciation Assessment

- **Purpose**: Evaluate pronunciation accuracy for speaking practice
- **Provider**: **Azure Speech only** (only provider that supports phoneme-level assessment)
- **Two Modes**:
  1. **Enjoy Mode**: Enjoy API provides short-lived Azure Speech token
  2. **BYOK Mode** (FUTURE): User provides own Azure Speech subscription key
- **Implementation**: Frontend uses Azure Speech SDK directly with token or subscription key
- **Features**:
  - Overall Score (0-100)
  - Phoneme-level accuracy errors
  - Fluency and Prosody scores
  - Word-level detailed feedback
- **Flow**:
  1. Client records audio (WAV/WebM)
  2. Obtain Azure token from Enjoy API OR use BYOK subscription key
  3. Client uses Azure Speech SDK to assess pronunciation
  4. Returns detailed JSON report
- **Request Format**:

  ```multipart/form-data
  audio: Blob
  referenceText: string
  language: string
  config: JSON string {
    "provider": "enjoy" | "byok",
    "byok": {
      "provider": "azure",
      "apiKey": "your-subscription-key",
      "region": "azure-region"
    }
  }
  ```

**Note**: Both enjoy and byok modes use Azure Speech SDK on frontend. The difference is token source: enjoy provides temporary token, byok uses user's subscription key.

## 3. Azure Speech Token Management

For non-BYOK Azure Speech usage, clients obtain time-limited tokens from Enjoy API:

- **Endpoint**: `GET /api/v1/services/azure-speech/token`
- **Response**: `{ token: string, expiresAt: number }`
- **Usage**: Client uses token with Azure Speech SDK directly (reduces latency vs. proxying through Enjoy API)

## 4. Local Model Support

Free users can use browser-local models powered by `@huggingface/transformers`:

- **Smart Translation**: LLM models (limited style support)
- **ASR**: Whisper models (tiny/small variants)
- **TTS**: Web Speech API or transformers.js TTS models
- **Dictionary**: Small LLM models (for contextual explanation, if feasible)
- **Fast Translation**: Not supported - always uses Enjoy API (free)
- **Assessment**: Not supported - requires Azure Speech Services

Local models run in Web Workers to avoid blocking the UI. Model weights are cached in browser storage after first download.

**Note**: Fast translation and basic dictionary lookup are always free via Enjoy API, so local mode is not needed for these services.

## 5. BYOK (Bring Your Own Key) - Future Implementation

The service interface is designed to support BYOK, allowing users to:

- Provide their own API keys for multiple providers
- Bypass quota limits (using their own quotas)
- Use premium features without subscription
- Choose from multiple LLM providers based on preference

### Supported BYOK Providers (Planned)

1. **OpenAI**: GPT models (translation, dictionary), Whisper (ASR), TTS
2. **Google (Gemini)**: Gemini models for translation and dictionary
3. **Claude (Anthropic)**: Claude models for translation and dictionary
4. **Azure**: Azure OpenAI Service, Azure Speech (ASR, TTS, Assessment)
5. **Custom**: Any OpenAI-compatible endpoint

### Implementation

BYOK uses **Vercel AI SDK** for unified LLM access and **official SDKs** for speech services:

```json
{
  "dependencies": {
    "ai": "^5.0.0",                    // Vercel AI SDK core
    "@ai-sdk/openai": "^2.0.0",        // OpenAI provider
    "@ai-sdk/anthropic": "^2.0.0",     // Claude provider
    "@ai-sdk/google": "^2.0.0",        // Gemini provider
    "openai": "^6.0.0"                 // OpenAI SDK for speech
  }
}
```

### BYOK Service Support Matrix

| Service | OpenAI | Claude | Gemini | Azure | Custom |
|---------|--------|--------|--------|-------|--------|
| Smart Translation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dictionary (contextual) | ✅ | ✅ | ✅ | ✅ | ✅ |
| ASR | ✅ | ❌ | ❌ | ✅ | ✅ |
| TTS | ✅ | ❌ | ❌ | ✅ | ✅ |
| Assessment | ❌ | ❌ | ❌ | ✅ | ❌ |
| Fast Translation | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dictionary (basic) | ❌ | ❌ | ❌ | ❌ | ❌ |

**Note**: Fast translation and basic dictionary lookup are always free via Enjoy API and do not support BYOK.

### Provider Adapters

All BYOK providers are accessed through **provider adapters** (implemented using Vercel AI SDK) that convert their native APIs to OpenAI-compatible format. This ensures:

- Consistent interface across all providers
- Easy addition of new providers
- Same prompt templates work for all providers
- Unified error handling and response format

### Prompt Management

All prompts are **centrally managed** in `/src/services/ai/prompts/`:

- `translation-prompts.ts`: Prompts for smart translation with style support
- `dictionary-prompts.ts`: Prompts for contextual word lookup
- `language-utils.ts`: Language code mappings and utilities

These prompts are shared across:
- Enjoy API (cloud service)
- Local models (transformers.js)
- BYOK providers (OpenAI, Google, Claude, etc.)

This ensures consistent output quality regardless of provider.

## 6. Architecture Design Principles

### 6.1 Unified Interface

All AI services follow a consistent pattern:

```typescript
// Unified response format
interface AIServiceResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    serviceType: AIServiceType
    provider: AIProvider
    tokensUsed?: number
    cost?: number
  }
}
```

### 6.2 Provider Abstraction

The system uses a three-tier provider model:

1. **Enjoy API (Cloud)**:
   - OpenAI-compatible interface
   - Managed quotas and authentication
   - Backend can use any LLM provider (OpenAI, Cloudflare, etc.)

2. **Local Models**:
   - Browser-based using transformers.js
   - Web Worker isolation for performance
   - Same prompts as cloud services

3. **BYOK (Future)**:
   - Multiple provider support via adapters
   - OpenAI-compatible unified interface
   - Same prompts as other modes

### 6.3 Prompt Centralization

All prompts are managed in `/src/services/ai/prompts/`:

**Benefits**:
- Single source of truth for prompt templates
- Easy to update and maintain
- Consistent output across providers
- Supports A/B testing and optimization

**Structure**:
```
prompts/
├── index.ts              # Export all prompts
├── language-utils.ts     # Language mappings
├── translation-prompts.ts # Translation prompt templates
└── dictionary-prompts.ts  # Dictionary prompt templates
```

### 6.4 Provider Adapters (BYOK)

Provider adapters handle API differences and are located in `/src/services/ai/provider-adapters.ts`:

**Responsibilities**:
- Convert OpenAI format → Provider-specific format
- Convert Provider response → OpenAI format
- Handle authentication headers
- Construct correct endpoints

**Supported Providers**:
- **OpenAI**: Direct OpenAI API access
- **Google**: Gemini API → OpenAI format conversion
- **Claude**: Anthropic API → OpenAI format conversion
- **Azure**: Azure OpenAI Service
- **Custom**: Any OpenAI-compatible endpoint

**Example Flow**:
```
User Request → AI Service → Provider Adapter → External API
                    ↓              ↓                 ↓
              (OpenAI format) (Transform)   (Provider format)
                    ↑              ↑                 ↑
User Response ← AI Service ← Provider Adapter ← External API
```

### 6.5 Error Handling

Unified error codes across all services:

- `LOCAL_*_ERROR`: Local model failures
- `*_ERROR`: General service errors
- `BYOK_*_ERROR`: BYOK authentication/request errors (future)
- `QUOTA_EXCEEDED`: User quota exhausted
- `INVALID_API_KEY`: BYOK key validation failed (future)

### 6.6 Service Type Definitions

All type definitions are centralized in `/src/services/ai/types.ts`:

```typescript
// Provider types
type AIProvider = 'enjoy' | 'byok' | 'local'
type BYOKProvider = 'openai' | 'google' | 'claude' | 'azure' | 'custom'

// Service types
type AIServiceType = 'fastTranslation' | 'smartTranslation' | 'tts' | 'asr' | 'dictionary' | 'assessment'

// Configuration
interface AIServiceConfig {
  provider: AIProvider
  byok?: BYOKConfig       // For BYOK mode
  localModel?: LocalModelConfig  // For local mode
}
```

This ensures type safety and consistency across all services.

## 7. BYOK Implementation

### 7.1 Current Status

✅ **Implemented and Ready** (as of November 2025)

BYOK support has been fully implemented using **Vercel AI SDK** for unified LLM access and official SDKs for speech services.

### 7.2 Dependencies

```json
{
  "dependencies": {
    "ai": "^5.0.0",                    // Vercel AI SDK core
    "@ai-sdk/openai": "^2.0.0",        // OpenAI provider
    "@ai-sdk/anthropic": "^2.0.0",     // Anthropic (Claude) provider
    "@ai-sdk/google": "^2.0.0",        // Google (Gemini) provider
    "openai": "^6.0.0"                 // OpenAI SDK for speech services
  }
}
```

### 7.3 Usage Example

```typescript
// Smart Translation with OpenAI BYOK
const result = await smartTranslationService.translate({
  sourceText: 'Hello world',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  style: 'natural',
  config: {
    provider: 'byok',
    byok: {
      provider: 'openai',
      apiKey: 'sk-...your-key...',
      model: 'gpt-4',
    },
  },
})

// Dictionary Lookup with Claude BYOK
const dictResult = await dictionaryService.lookup({
  word: 'ephemeral',
  context: 'The beauty of this moment is ephemeral.',
  sourceLanguage: 'en',
  targetLanguage: 'zh',
  config: {
    provider: 'byok',
    byok: {
      provider: 'claude',
      apiKey: 'sk-ant-...your-key...',
      model: 'claude-3-sonnet-20240229',
    },
  },
})

// ASR with OpenAI BYOK
const asrResult = await asrService.transcribe({
  audioBlob: audioBlob,
  language: 'en',
  config: {
    provider: 'byok',
    byok: {
      provider: 'openai',
      apiKey: 'sk-...your-key...',
      model: 'whisper-1',
    },
  },
})
```

### 7.4 Service Implementation

BYOK services are located in `/src/services/ai/byok/`:
- **`llm-service.ts`**: Smart translation and dictionary using Vercel AI SDK
- **`speech-service.ts`**: ASR and TTS using OpenAI SDK

Enjoy API services are located in `/src/services/ai/enjoy/`:
- **`llm-service.ts`**: Smart translation and dictionary (OpenAI-compatible API)
- **`speech-service.ts`**: ASR and TTS (OpenAI-compatible API)
- **`fast-translation.ts`**: Fast translation using dedicated models
- **`azure-speech.ts`**: Azure Speech token management

All providers use the **same centralized prompts** from `/src/services/ai/prompts/`, ensuring consistent output across different providers.

### 7.5 Provider Support Matrix

| Service | OpenAI | Claude | Gemini | Azure | Custom |
|---------|--------|--------|--------|-------|--------|
| Smart Translation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dictionary | ✅ | ✅ | ✅ | ✅ | ✅ |
| ASR | ✅ | ❌ | ❌ | ✅ | ✅ |
| TTS | ✅ | ❌ | ❌ | ✅ | ✅ |
| Assessment | ❌ | ❌ | ❌ | ✅ | ❌ |

**Note**: Pronunciation assessment only supports Azure Speech Services.
