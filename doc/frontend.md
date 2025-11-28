# Frontend Development Guidelines

## 1. Tech Stack Details

-   **Framework**: React 19
-   **Build**: Vite
-   **Router**: TanStack Router (Typesafe, file-based)
-   **Async State**: TanStack Query (v5)
-   **Global Store**: Zustand
-   **UI Components**: shadcn/ui (New York style, with CSS variables)
-   **Styling**: Tailwind CSS v4
-   **Icons**: Lucide React

## 2. Component Architecture

### UI Components (`src/components/ui`)
All base UI components are provided by **shadcn/ui**. Components are copied directly into the project at `src/components/ui/`, allowing full customization.

#### Adding Components
-   **Using CLI**: `bun x shadcn@latest add [component-name]`
-   **Using MCP**: The shadcn MCP server can be used to:
    -   Search for components: `mcp_shadcn_search_items_in_registries`
    -   View component details: `mcp_shadcn_view_items_in_registries`
    -   Get installation commands: `mcp_shadcn_get_add_command_for_items`
    -   View examples: `mcp_shadcn_get_item_examples_from_registries`

#### Component Configuration
-   **Config File**: `components.json` (root directory)
-   **Style**: New York
-   **Base Color**: Neutral
-   **CSS Variables**: Enabled (theming via CSS variables)
-   **Path Aliases**:
    -   `@/components/ui` → `src/components/ui`
    -   `@/lib/utils` → `src/lib/utils` (contains `cn()` utility for class merging)

#### Usage Pattern
```tsx
import { Button } from "@/components/ui/button"

function MyComponent() {
  return <Button variant="default">Click me</Button>
}
```

#### Customization
-   Components are regular React/TypeScript files - modify directly as needed
-   Use Tailwind utility classes for styling adjustments
-   Do not write custom CSS for basic elements; extend shadcn components instead

### Feature Components
Complex logic resides in `src/features`.
-   **Example**: `src/features/practice/PracticeSession.tsx` contains the state machine for the practice loop, while `src/components/practice/Waveform.tsx` is a dumb presentation component.

## 3. State Management

### Server State (TanStack Query)
Used for all data that persists to the backend.
-   `useMaterials()`: Fetches list of materials.
-   `useVocabulary()`: Syncs vocab list.

### Local/Global State (Zustand)
Used for UI state and device settings.
-   `usePlayerStore`: Playback status, volume, speed.
-   `useSettingsStore`: Theme, preferred language, daily goals.

## 4. Key Workflows

### Material Import
1.  User selects file.
2.  File is stored in IndexedDB immediately.
3.  Metadata entry created.
4.  Background process triggers local ASR (if needed).

### The Practice Page (`/practice/$id`)
-   **Layout**: Split screen (Video on top/left, Text/Controls on bottom/right).
-   **Immersive Mode**: Fullscreen option hiding navigation.
-   **Shortcuts**:
    -   `Space`: Play/Pause
    -   `R`: Record (Hold to record, release to stop)
    -   `ArrowLeft/Right`: Prev/Next sentence.

## 5. Styling & Responsiveness

### Tailwind CSS v4
-   **Configuration**: Uses `@tailwindcss/vite` plugin
-   **CSS File**: `src/styles.css` contains Tailwind imports and shadcn CSS variables
-   **Theme Variables**: Defined in `:root` and `.dark` selectors for light/dark mode

### shadcn/ui Theming
-   **CSS Variables**: All colors are defined as CSS variables (e.g., `--background`, `--foreground`, `--primary`)
-   **Dark Mode**: Automatically supported via `.dark` class on root element
-   **Radius**: Configurable via `--radius` CSS variable (default: 0.625rem)

### Design Principles
-   **Mobile-First**: Design for generic mobile screens first, then scale up
-   **Dark Mode**: Supported natively via Tailwind's `dark:` modifier and shadcn CSS variables
-   **Container Queries**: Use where components might appear in different sized contexts (e.g., Sidebar vs Main View)
-   **Utility Classes**: Prefer Tailwind utility classes over custom CSS

