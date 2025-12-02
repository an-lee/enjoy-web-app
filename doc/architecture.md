# System Architecture

## 1. High-Level Architecture

Enjoy Echo consists of three main components:

1. **Browser Extension** (Live): For online video platforms (YouTube, Netflix).
2. **Web App** (In Development): For local files, offline study, and management.
3. **Rails API Backend**: Central hub for auth, data sync, and AI service proxy.

The Web App acts as a Single Page Application (SPA) served via Cloudflare Pages.

### Diagram

```mermaid
graph TD
    User[User] --> Extension[Browser Extension]
    User --> WebApp[Web App (Vite/React)]

    subgraph "Client Side"
        Extension --> ChromeStorage[chrome.storage]
        WebApp --> IDB[IndexedDB (Dexie)]
        WebApp --> LocalASR[Local ASR (transformers.js)]
    end

    Extension -- HTTPS --> RailsAPI
    WebApp -- HTTPS --> RailsAPI

    subgraph "Backend Services"
        RailsAPI[Rails API Server]
        DB[(PostgreSQL)]
        Redis[(Redis)]
        S3[Object Storage]

        RailsAPI --> DB
        RailsAPI --> Redis
        RailsAPI --> S3
    end

    subgraph "AI Services"
        RailsAPI --> CF_AI[Cloudflare Workers AI]
        RailsAPI --> Azure[Azure Speech Services]

        CF_AI -- LLM/ASR/Translation --> RailsAPI
        Azure -- TTS/Assessment --> RailsAPI
    end
```

## 2. Technology Stack

### Frontend (Web App)

- **Build Tool**: Vite
- **Framework**: React 19 + TypeScript
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

### Backend (Rails API)

- **Framework**: Ruby on Rails (API Mode)
- **Database**: PostgreSQL
- **Cache/Queue**: Redis / Sidekiq
- **Authentication**: Devise + JWT

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
│   ├── echo/            # Echo practice mode specific components
│   └── dictionary/      # Dictionary popup/panel
├── routes/              # TanStack Router definitions
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Dashboard
│   ├── library.tsx      # Material management
│   ├── echo.$id.tsx     # Echo practice interface
│   └── vocabulary.tsx   # Vocabulary list
├── features/            # Business logic isolated by feature
│   ├── materials/       # Hooks/utils for material management
│   ├── echo/            # State machines for echo practice loop
│   └── sync/            # Synchronization logic
├── db/                  # Dexie configuration and schema
│   ├── schema.ts        # TypeScript interfaces for all entities
│   ├── database.ts      # Dexie database configuration
│   ├── id-generator.ts   # UUID v5 generators for deterministic IDs
│   └── *.ts             # Entity-specific helper functions
├── services/            # API clients and AI service wrappers
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
- **UserEcho**: Based on media ID + user ID
- **Recording**: Based on recording blob hash + user ID + reference offset
- **Transcript**: Based on media ID + language
- **Translation**: Based on source text + target language + style + custom prompt
- **CachedDefinition**: Based on word + language pair

See `doc/data-models.md` for detailed ID generation rules.
