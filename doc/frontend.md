# Frontend Development Guidelines

## 1. Tech Stack Details

- **Framework**: React 19
- **Build**: Vite
- **Router**: TanStack Router (Typesafe, file-based)
- **Async State**: TanStack Query (v5)
- **Global Store**: Zustand
- **UI Components**: shadcn/ui (New York style, with CSS variables)
- **Styling**: Tailwind CSS v4
- **Icons**: @iconify/react (using Lucide icon set)

## 2. Component Architecture

### UI Components (`src/components/ui`)

All base UI components are provided by **shadcn/ui**. Components are copied directly into the project at `src/components/ui/`, allowing full customization.

#### Adding Components

- **Using CLI**: `bun x shadcn@latest add [component-name]`
- **Using MCP**: The shadcn MCP server can be used to:
  - Search for components: `mcp_shadcn_search_items_in_registries`
  - View component details: `mcp_shadcn_view_items_in_registries`
  - Get installation commands: `mcp_shadcn_get_add_command_for_items`
  - View examples: `mcp_shadcn_get_item_examples_from_registries`

#### Component Configuration

- **Config File**: `components.json` (root directory)
- **Style**: New York
- **Base Color**: Neutral
- **CSS Variables**: Enabled (theming via CSS variables)
- **Path Aliases**:
  - `@/components/ui` → `src/components/ui`
  - `@/lib/utils` → `src/lib/utils` (contains `cn()` utility for class merging)

#### Usage Pattern

```tsx
import { Button } from "@/components/ui/button"

function MyComponent() {
  return <Button variant="default">Click me</Button>
}
```

#### Customization

- Components are regular React/TypeScript files - modify directly as needed
- Use Tailwind utility classes for styling adjustments
- Do not write custom CSS for basic elements; extend shadcn components instead

### Feature Components

Complex logic resides in `src/features`.

- **Example**: `src/features/echo/EchoSession.tsx` contains the state machine for the echo practice loop, while `src/components/echo/Waveform.tsx` is a dumb presentation component.

## 3. State Management

### Server State (TanStack Query)

Used for all data that persists to the database (local IndexedDB).

**Architecture Pattern:**
```
UI Layer → Query Hooks (React Query) → Database (Dexie)
```

**Query Hooks Structure:**

All React Query hooks are organized in `src/hooks/queries/`:

- `use-audio-queries.ts`: Audio data operations
  - `useAudio()`: Fetch single audio by ID or translation key
  - `useAudios()`: Fetch multiple audios by translation key
  - `useAudioHistory()`: Fetch TTS audio history with search
  - `useSaveAudio()`: Save audio mutation
  - `useDeleteAudio()`: Delete audio mutation

- `use-translation-queries.ts`: Translation data operations
  - `useTranslationHistory()`: Fetch translation history with pagination
  - `useFindExistingTranslation()`: Find translation by parameters
  - `useSaveTranslation()`: Save translation mutation
  - `useUpdateTranslation()`: Update translation mutation

- `use-transcript-queries.ts`: Transcript data operations
  - `useTranscript()`: Fetch single transcript by ID
  - `useTranscriptsByTarget()`: Fetch transcripts by target (Video/Audio)
  - `useSaveTranscript()`: Save transcript mutation
  - `useUpdateTranscript()`: Update transcript mutation
  - `useDeleteTranscript()`: Delete transcript mutation

**Import Pattern:**

```tsx
// From queries folder (data access layer)
import { useAudios, useSaveAudio } from '@/hooks/queries'

// From main hooks (includes everything)
import { useAudios, useTTS, useIsMobile } from '@/hooks'
```

**Query Keys:**

Each query hook file exports a query keys factory for cache management:

```tsx
import { audioQueryKeys } from '@/hooks/queries'

// Use query keys for manual cache invalidation
queryClient.invalidateQueries({ queryKey: audioQueryKeys.history() })
```

**Benefits:**

- **Separation of Concerns**: Data access layer separated from UI layer
- **Caching**: Automatic caching and refetching with React Query
- **Optimistic Updates**: Built-in support for optimistic UI updates
- **Type Safety**: Full TypeScript support with type inference
- **Cache Invalidation**: Automatic cache invalidation on mutations

**Usage Examples:**

```tsx
// Fetching data
import { useAudios, useAudioHistory } from '@/hooks/queries'

function AudioList() {
  const { data: history, isLoading } = useAudioHistory(true, 'search term')
  const { audios, addAudio } = useAudios({ translationKey: 'xyz' })

  if (isLoading) return <Loading />
  return <div>{audios.map(audio => ...)}</div>
}

// Mutations
import { useSaveAudio, useDeleteAudio } from '@/hooks/queries'

function SaveAudioButton() {
  const saveAudio = useSaveAudio()
  const deleteAudio = useDeleteAudio()

  const handleSave = async () => {
    await saveAudio.mutateAsync({
      provider: 'tts',
      sourceText: 'Hello',
      // ... other fields
    })
    // Cache automatically invalidated, UI auto-updates
  }

  return <button onClick={handleSave}>Save</button>
}
```

**Naming Convention:**

- Query hooks follow the pattern: `use-{entity}-queries.ts`
- All React Query hooks are in `src/hooks/queries/`
- Business logic hooks (e.g., `useTTS`) are in `src/hooks/` root
- Utility hooks (e.g., `useMobile`) are in `src/hooks/` root

### Local/Global State (Zustand)

Used for UI state and device settings.

- `usePlayerStore`: Playback status, volume, speed, current session.
- `useSettingsStore`: Theme, preferred language, daily goals.
- `useHotkeysStore`: Custom keyboard shortcut bindings.

## 4. Keyboard Shortcuts System

The app uses **react-hotkeys-hook** for keyboard shortcut handling, with a custom integration layer for:
- Scope-based activation (global, player, library, modal)
- User-customizable key bindings
- Persistent settings via Zustand

### Architecture

```
src/
├── stores/
│   └── hotkeys.ts           # Hotkey definitions & custom bindings store
└── components/
    └── hotkeys/
        ├── index.ts
        ├── hotkeys-provider.tsx    # HotkeysProvider wrapper with scope management
        ├── use-app-hotkeys.ts      # useAppHotkey hook (integrates with store)
        └── hotkeys-help-modal.tsx  # Keyboard shortcuts help dialog
```

### Key Components

**`HotkeyDefinition`** - Defines a keyboard shortcut:

```typescript
interface HotkeyDefinition {
  id: string              // e.g., 'player.togglePlay'
  defaultKeys: string     // e.g., 'space', 'ctrl+k'
  description: string
  descriptionKey: string  // i18n key
  scope: HotkeyScope      // 'global' | 'player' | 'library' | 'modal'
  customizable: boolean
  useKey?: boolean        // Use actual key value (for ?, !)
}
```

**`useAppHotkey`** - Hook to register a shortcut:

```tsx
import { useAppHotkey } from '@/components/hotkeys'

function PlayerControls({ onTogglePlay }) {
  useAppHotkey('player.togglePlay', (e) => {
    e.preventDefault()
    onTogglePlay()
  }, { deps: [onTogglePlay] })
}
```

**`AppHotkeysProvider`** - Wraps the app, manages scope activation:

```tsx
// In __root.tsx
<AppHotkeysProvider>
  {children}
</AppHotkeysProvider>
```

### Scopes

Scopes control when shortcuts are active:

| Scope | Active When |
|-------|-------------|
| `global` | Always (uses wildcard `*`) |
| `player` | Player is visible (mini or expanded) |
| `library` | Library page is active |
| `modal` | Modal dialog is open |

Scope activation is managed by `ScopeManager` in `hotkeys-provider.tsx`.

### Default Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `?` | Show keyboard shortcuts help | global |
| `Ctrl+K` | Open search | global |
| `Ctrl+,` | Open settings | global |
| `Space` | Play / Pause | player |
| `←` / `→` | Seek backward / forward 5s | player |
| `↑` / `↓` | Volume up / down | player |
| `M` | Mute / Unmute | player |
| `R` | Replay segment | player |
| `Escape` | Collapse player | player |

### Adding New Shortcuts

1. Add definition to `HOTKEY_DEFINITIONS` in `src/stores/hotkeys.ts`
2. Use `useAppHotkey(actionId, callback)` in your component
3. Add translation keys to all locale files (`hotkeys.*`)

### Special Characters

For keys like `?`, `!`, use `useKey: true` in the definition:

```typescript
{
  id: 'global.help',
  defaultKeys: '?',
  useKey: true,  // Required for character-based keys
  // ...
}
```

## 5. Key Workflows

### Material Import

1. User selects file.
2. File is stored in IndexedDB immediately.
3. Metadata entry created.
4. Background process triggers local ASR (if needed).

### The Echo Practice Page (`/echo/$id`)

- **Layout**: Split screen (Video on top/left, Text/Controls on bottom/right).
- **Immersive Mode**: Fullscreen option hiding navigation.
- **Shortcuts**: See Keyboard Shortcuts System above.

## 6. Internationalization (i18n)

### i18next Configuration

The app uses **i18next** with **react-i18next** for internationalization.

#### Supported Languages

- English (en) - Default
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Spanish (es)
- French (fr)
- German (de)
- Portuguese (pt)

#### Configuration

- **Config File**: `src/lib/i18n.ts`
- **Translation Files**: `src/locales/{lang}/translation.json`
- **Language Detection**: Automatically detects from:
  1. Settings store (`enjoy-settings` localStorage)
  2. Browser navigator language
  3. HTML lang attribute

#### Usage in Components

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <p>{t('common.loading')}</p>
    </div>
  )
}
```

#### Language Switching

Language changes are managed through the settings store:

```tsx
import { useSettingsStore } from '@/stores/settings'

function LanguageSwitcher() {
  const { preferredLanguage, setPreferredLanguage } = useSettingsStore()

  return (
    <select
      value={preferredLanguage}
      onChange={(e) => setPreferredLanguage(e.target.value)}
    >
      <option value="en">English</option>
      <option value="zh">Chinese</option>
      {/* ... */}
    </select>
  )
}
```

The settings store automatically syncs with i18next when the language changes.

#### Translation File Structure

Translation files follow a nested JSON structure:

```json
{
  "common": {
    "appName": "Enjoy Echo",
    "loading": "Loading...",
    "error": "Error"
  },
  "settings": {
    "title": "Settings",
    "theme": "Theme"
  }
}
```

Access nested keys using dot notation: `t('common.appName')`

## 7. Styling & Responsiveness

### Tailwind CSS v4

- **Configuration**: Uses `@tailwindcss/vite` plugin
- **CSS File**: `src/styles.css` contains Tailwind imports and shadcn CSS variables
- **Theme Variables**: Defined in `:root` and `.dark` selectors for light/dark mode

### shadcn/ui Theming

- **CSS Variables**: All colors are defined as CSS variables (e.g., `--background`, `--foreground`, `--primary`)
- **Dark Mode**: Automatically supported via `.dark` class on root element
- **Radius**: Configurable via `--radius` CSS variable (default: 0.625rem)

### Design Principles

- **Mobile-First**: Design for generic mobile screens first, then scale up
- **Dark Mode**: Supported natively via Tailwind's `dark:` modifier and shadcn CSS variables
- **Container Queries**: Use where components might appear in different sized contexts (e.g., Sidebar vs Main View)
- **Utility Classes**: Prefer Tailwind utility classes over custom CSS
