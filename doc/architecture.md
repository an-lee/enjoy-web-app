# System Architecture

## 1. High-Level Architecture

Enjoy Echo consists of three main components:

1. **Browser Extension** (Live): For online video platforms (YouTube, Netflix).
2. **Web App** (In Development): For local files, offline study, and management.
3. **Rails API Backend**: User information management (authentication, profiles, data sync).
4. **Hono API Worker**: All AI services (translation, dictionary, ASR, TTS, assessment).

The Web App is a full-stack application deployed as a Cloudflare Worker, providing:

- **SSR (Server-Side Rendering)**: Using TanStack Start
- **API Layer**: Hono API Worker for serverless API endpoints
- **Static Assets**: Workers Assets for client-side resources

### Diagram

```mermaid
graph TD
    User[User] --> Extension[Browser Extension]
    User --> WebApp[Web App Cloudflare Worker]

    subgraph "Client Side"
        Extension --> ChromeStorage[chrome.storage]
        WebApp --> IDB[IndexedDB (Dexie)]
        WebApp --> LocalASR[Local ASR (transformers.js)]
    end

    subgraph "Cloudflare Worker"
        WebApp --> SSR[TanStack Start SSR]
        WebApp --> HonoAPI[Hono API Worker /api/*]
        WebApp --> Assets[Workers Assets]
    end

    Extension -- HTTPS --> RailsAPI
    WebApp -- HTTPS --> RailsAPI[User Info Management]
    WebApp -- /api/* --> HonoAPI[AI Services]

    subgraph "Backend Services"
        RailsAPI[Rails API Server<br/>User Info Only]
        DB[(PostgreSQL)]
        Redis[(Redis)]
        S3[Object Storage]

        RailsAPI --> DB
        RailsAPI --> Redis
        RailsAPI --> S3
    end

    subgraph "AI Services"
        HonoAPI --> CF_AI[Cloudflare Workers AI]
        HonoAPI --> Azure[Azure Speech Services]
        HonoAPI --> CF_Bindings[Cloudflare Bindings<br/>KV/D1/R2]

        CF_AI -- LLM/ASR/Translation --> HonoAPI
        Azure -- TTS/Assessment --> HonoAPI
    end
```

## 2. Technology Stack

### Frontend (Web App)

- **Build Tool**: Vite + `@cloudflare/vite-plugin`
- **Framework**: React 19 + TypeScript
- **SSR Framework**: TanStack Start
- **Routing**: TanStack Router (File-based routing)
- **State Management**:
  - Server State: TanStack Query
  - Global UI State: Zustand
- **Local Database**: Dexie.js (IndexedDB wrapper)
- **PWA**: vite-plugin-pwa
- **ML/AI**: @huggingface/transformers (Local Whisper)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI based)
- **I18n**: i18next

### API Layer (Cloudflare Worker)

- **API Framework**: Hono
- **Deployment**: Cloudflare Worker (not Pages)
- **Static Assets**: Workers Assets
- **Bindings Support**: KV, D1, AI, R2, etc.
- **Route Prefix**: `/api/*`
- **Responsibility**: All AI services (translation, dictionary, ASR, TTS, assessment)

### Backend (Rails API)

- **Framework**: Ruby on Rails (API Mode)
- **Database**: PostgreSQL
- **Cache/Queue**: Redis / Sidekiq
- **Authentication**: Devise + JWT
- **Responsibility**: User information management only (auth, profiles, data sync)

### External Services

- **LLM (Dictionary)**: Cloudflare Workers AI (Llama/Mistral)
- **ASR (Cloud)**: Cloudflare Workers AI (Whisper)
- **Translation**: Cloudflare Workers AI (M2M100) / DeepL (Fallback)
- **TTS & Assessment**: Azure Speech Services

## 3. Project Structure

The Web App follows a feature-based structure combined with functional grouping.

```bash
src/
├── components/          # Shared UI components
│   ├── ui/              # Atom components (buttons, inputs)
│   ├── player/          # Video/Audio player components
│   ├── hotkeys/         # Keyboard shortcuts system
│   ├── echo/            # Echo practice mode specific components
│   └── dictionary/      # Dictionary popup/panel
├── routes/              # TanStack Router definitions
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Dashboard
│   ├── library.tsx      # Material management
│   ├── echo.$id.tsx     # Echo practice interface
│   └── vocabulary.tsx   # Vocabulary list
├── server/              # Server-side code (Cloudflare Worker)
│   ├── index.ts         # Custom server-entry (routes /api/* to Hono)
│   └── api.ts           # Hono API routes definition
├── hooks/               # React hooks
│   ├── queries/         # React Query hooks (data access layer)
│   │   ├── use-audio-queries.ts      # Audio queries & mutations
│   │   ├── use-translation-queries.ts # Translation queries & mutations
│   │   ├── use-transcript-queries.ts  # Transcript queries & mutations
│   │   └── index.ts                   # Re-exports all query hooks
│   ├── use-tts.ts       # TTS business logic hook
│   ├── use-model-status.ts # Service status hook
│   ├── use-mobile.ts    # UI utility hook
│   └── index.ts         # Main hooks entry point
├── features/            # Business logic isolated by feature
│   ├── materials/       # Hooks/utils for material management
│   ├── echo/            # State machines for echo practice loop
│   └── sync/            # Synchronization logic
├── db/                  # Dexie configuration and schema
│   ├── schema.ts        # Dexie database configuration
│   ├── repositories/    # Database operations layer
│   │   ├── video-repository.ts
│   │   ├── audio-repository.ts
│   │   ├── transcript-repository.ts
│   │   ├── translation-repository.ts
│   │   └── index.ts     # Re-exports all repositories
│   ├── id-generator.ts  # UUID v5 generators for deterministic IDs
│   └── index.ts         # Unified database entry point
├── api/                 # Rails API client (external backend)
│   ├── auth.ts          # Authentication endpoints
│   ├── client.ts         # API client configuration
│   ├── dictionary.ts     # Dictionary lookup
│   └── translation.ts    # Translation services
├── ai/                  # AI service providers (Enjoy/Local/BYOK)
│   ├── services/        # Service routers (ASR, TTS, translation, etc.)
│   ├── providers/       # Provider implementations
│   │   ├── enjoy/       # Enjoy API provider
│   │   │   ├── client.ts        # EnjoyAIClient (OpenAI-compatible)
│   │   │   ├── services/        # OpenAI-compatible services
│   │   │   └── azure/           # Azure Speech (token-based)
│   │   ├── byok/        # BYOK provider (user's API keys)
│   │   │   ├── client.ts        # BYOKClient (multi-provider)
│   │   │   ├── services/        # OpenAI-compatible services
│   │   │   └── azure/           # Azure Speech (user key)
│   │   └── local/       # Local provider (transformers.js)
│   │       ├── services/        # Service implementations
│   │       └── workers/         # Web Workers for models
│   ├── core/            # Core abstractions (config, error handling, routing)
│   ├── prompts/         # Centralized prompt templates
│   └── types/           # Type definitions
├── stores/              # Zustand global stores (settings, auth)
├── locales/             # i18next translation files
│   ├── en/              # English translations
│   ├── zh/              # Chinese translations
│   ├── ja/              # Japanese translations
│   ├── ko/              # Korean translations
│   ├── es/              # Spanish translations
│   ├── fr/              # French translations
│   ├── de/              # German translations
│   └── pt/              # Portuguese translations
└── lib/                 # Utility functions (i18n config)
```

## 4. ID System Architecture

### UUID v5 Deterministic IDs

All entities use **UUID v5 (deterministic UUIDs)** for their primary keys. This design choice provides several key benefits:

- **Unified IDs**: Same ID used locally (IndexedDB) and on server (PostgreSQL), eliminating the need for `serverId` mapping
- **Deterministic**: Same inputs always produce the same UUID, ensuring consistency across devices
- **Simplified Sync**: No ID mapping required during synchronization
- **Idempotent Operations**: Safe to retry sync operations without creating duplicates

ID generation is centralized in `src/db/id-generator.ts` with specific rules for each entity type:

- **Video/Audio**: Based on provider ID + provider type, or file hash for local uploads
- **Recording**: Based on recording blob hash + user ID + reference offset
- **Transcript**: Based on media ID + language
- **Translation**: Based on source text + target language + style + custom prompt
- **CachedDefinition**: Based on word + language pair

See `doc/data-models.md` for detailed ID generation rules.

## 5. Deployment Architecture

### Cloudflare Worker Deployment

The Web App is deployed as a **Cloudflare Worker** (not Pages), providing a unified runtime for:

1. **SSR (Server-Side Rendering)**: TanStack Start handles all page requests
2. **API Layer**: Hono API Worker handles `/api/*` routes
3. **Static Assets**: Workers Assets serves client-side resources (JS, CSS, images)

### Request Routing Flow

```text
Request → Cloudflare Worker
  ├─ /api/* → Hono API Handler → JSON Response
  ├─ Static Assets (JS/CSS/images) → Workers Assets → File Response
  └─ Page Requests → TanStack Start SSR → HTML Response
```

### Configuration

The deployment is configured via `wrangler.jsonc`:

- **Main Entry**: `./src/worker/index.ts` - Custom server-entry that routes requests
- **Assets**: `./dist/client` - Client-side build output
- **Route Priority**: `/api/*` routes are handled by Worker first

### Benefits

- **Unified Runtime**: Single Worker handles all request types
- **Edge Computing**: Low latency with global edge network
- **Cloudflare Bindings**: Direct access to KV, D1, AI, R2, etc.
- **Cost Effective**: Pay per request, no idle costs
- **SSR Support**: Full server-side rendering capabilities

For detailed API Worker setup and usage, see [API Worker Integration Guide](./api-worker-integration.md).

## 6. Web Workers Architecture

The application uses **Web Workers** extensively to offload CPU-intensive tasks from the main thread, ensuring a responsive UI during heavy computations. All workers are managed through a centralized **Worker Status Store** (`useWorkerStatusStore`) that provides standardized status tracking and monitoring.

**Worker Types**:

- `audio-analysis`: Audio decoding and analysis (WebCodecs / Web Audio API)
- `asr`: Automatic Speech Recognition using Whisper (transformers.js)
- `smart-translation`: LLM-based style-aware translation (transformers.js)
- `smart-dictionary`: Contextual dictionary lookup (transformers.js)
- `tts`: Text-to-Speech synthesis (Kokoro TTS)
- `sync`: Network sync operations (Fetch API)

**Key Features**:

- Centralized status management via Zustand store
- Standardized lifecycle tracking (idle → initializing → ready → running)
- Task management with concurrent task tracking
- Progress reporting for long-running operations
- Unified error handling with detailed error information

For detailed information about worker implementation, lifecycle, message protocols, and best practices, see [Web Workers Architecture](./worker-architecture.md).
