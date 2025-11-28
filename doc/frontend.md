# Frontend Development Guidelines

## 1. Tech Stack Details

-   **Framework**: React 18
-   **Build**: Vite
-   **Router**: TanStack Router (Typesafe, file-based)
-   **Async State**: TanStack Query (v5)
-   **Global Store**: Zustand

## 2. Component Architecture

### UI Components (`src/components/ui`)
Base components (Button, Dialog, Input) should be built using **shadcn/ui**. Do not write custom CSS for basic elements if possible; use Tailwind utility classes.

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
-   **Mobile-First**: Design for generic mobile screens first, then scale up.
-   **Dark Mode**: Supported natively via Tailwind's `dark:` modifier.
-   **Container Queries**: Use where components might appear in different sized contexts (e.g., Sidebar vs Main View).

