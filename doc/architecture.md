# System Architecture

## 1. High-Level Architecture

Enjoy Echo consists of three main components:
1.  **Browser Extension** (Live): For online video platforms (YouTube, Netflix).
2.  **Web App** (In Development): For local files, offline study, and management.
3.  **Rails API Backend**: Central hub for auth, data sync, and AI service proxy.

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
-   **Build Tool**: Vite
-   **Framework**: React 19 + TypeScript
-   **Routing**: TanStack Router (File-based routing)
-   **State Management**:
    -   Server State: TanStack Query
    -   Global UI State: Zustand
-   **Local Database**: Dexie.js (IndexedDB wrapper)
-   **PWA**: vite-plugin-pwa
-   **ML/AI**: @huggingface/transformers (Local Whisper)
-   **Styling**: Tailwind CSS
-   **UI Components**: shadcn/ui (Radix UI based)
-   **I18n**: i18next

### Backend (Rails API)
-   **Framework**: Ruby on Rails (API Mode)
-   **Database**: PostgreSQL
-   **Cache/Queue**: Redis / Sidekiq
-   **Authentication**: Devise + JWT

### External Services
-   **LLM (Dictionary)**: Cloudflare Workers AI (Llama/Mistral)
-   **ASR (Cloud)**: Cloudflare Workers AI (Whisper)
-   **Translation**: Cloudflare Workers AI (M2M100) / DeepL (Fallback)
-   **TTS & Assessment**: Azure Speech Services

## 3. Project Structure

The Web App follows a feature-based structure combined with functional grouping.

```
src/
├── components/          # Shared UI components
│   ├── ui/              # Atom components (buttons, inputs)
│   ├── player/          # Video/Audio player components
│   ├── practice/        # Practice mode specific components
│   └── dictionary/      # Dictionary popup/panel
├── routes/              # TanStack Router definitions
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Dashboard
│   ├── library/         # Material management
│   ├── practice/        # Shadowing interface
│   └── vocabulary/      # Vocabulary list
├── features/            # Business logic isolated by feature
│   ├── materials/       # Hooks/utils for material management
│   ├── practice/        # State machines for practice loop
│   └── sync/            # Synchronization logic
├── db/                  # Dexie configuration and schema
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

