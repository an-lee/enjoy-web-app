/**
 * Hotkeys Store - Global keyboard shortcuts configuration
 *
 * Features:
 * - Default keybindings for all application actions
 * - User-customizable shortcuts (persisted to localStorage)
 * - Scope-based organization (global, player, library, modal)
 * - Description metadata for help display
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// Types
// ============================================================================

export type HotkeyScope = 'global' | 'player' | 'library' | 'modal'

export interface HotkeyDefinition {
  /** Unique identifier for the action */
  id: string
  /** Default key binding (e.g., 'space', 'ctrl+k') */
  defaultKeys: string
  /** Human-readable description */
  description: string
  /** i18n key for description */
  descriptionKey: string
  /** Scope this hotkey belongs to */
  scope: HotkeyScope
  /** Whether this hotkey can be customized by user */
  customizable: boolean
}

interface HotkeysState {
  /** User's custom key bindings: { actionId: keys } */
  customBindings: Record<string, string>

  /** Set a custom binding for an action */
  setBinding: (actionId: string, keys: string) => void

  /** Reset a specific binding to default */
  resetBinding: (actionId: string) => void

  /** Reset all bindings to defaults */
  resetAllBindings: () => void

  /** Get the current keys for an action (custom or default) */
  getKeys: (actionId: string) => string
}

// ============================================================================
// Default Hotkey Definitions
// ============================================================================

export const HOTKEY_DEFINITIONS: HotkeyDefinition[] = [
  // Global scope - always active
  {
    id: 'global.help',
    defaultKeys: '?',
    description: 'Show keyboard shortcuts',
    descriptionKey: 'hotkeys.help',
    scope: 'global',
    customizable: true,
  },
  {
    id: 'global.search',
    defaultKeys: 'ctrl+k',
    description: 'Open search',
    descriptionKey: 'hotkeys.search',
    scope: 'global',
    customizable: true,
  },
  {
    id: 'global.settings',
    defaultKeys: 'ctrl+,',
    description: 'Open settings',
    descriptionKey: 'hotkeys.settings',
    scope: 'global',
    customizable: true,
  },

  // Player scope - active when player is visible
  {
    id: 'player.togglePlay',
    defaultKeys: 'space',
    description: 'Play / Pause',
    descriptionKey: 'hotkeys.togglePlay',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.seekBackward',
    defaultKeys: 'left',
    description: 'Seek backward 5s',
    descriptionKey: 'hotkeys.seekBackward',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.seekForward',
    defaultKeys: 'right',
    description: 'Seek forward 5s',
    descriptionKey: 'hotkeys.seekForward',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.volumeUp',
    defaultKeys: 'up',
    description: 'Volume up',
    descriptionKey: 'hotkeys.volumeUp',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.volumeDown',
    defaultKeys: 'down',
    description: 'Volume down',
    descriptionKey: 'hotkeys.volumeDown',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.toggleMute',
    defaultKeys: 'm',
    description: 'Mute / Unmute',
    descriptionKey: 'hotkeys.toggleMute',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.collapse',
    defaultKeys: 'escape',
    description: 'Collapse player',
    descriptionKey: 'hotkeys.collapse',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.replaySegment',
    defaultKeys: 'r',
    description: 'Replay current segment',
    descriptionKey: 'hotkeys.replaySegment',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.prevSegment',
    defaultKeys: 'shift+left',
    description: 'Previous segment',
    descriptionKey: 'hotkeys.prevSegment',
    scope: 'player',
    customizable: true,
  },
  {
    id: 'player.nextSegment',
    defaultKeys: 'shift+right',
    description: 'Next segment',
    descriptionKey: 'hotkeys.nextSegment',
    scope: 'player',
    customizable: true,
  },

  // Library scope - active when browsing library
  {
    id: 'library.search',
    defaultKeys: '/',
    description: 'Focus search',
    descriptionKey: 'hotkeys.librarySearch',
    scope: 'library',
    customizable: true,
  },

  // Modal scope - active when modal is open (usually disables other scopes)
  {
    id: 'modal.close',
    defaultKeys: 'escape',
    description: 'Close modal',
    descriptionKey: 'hotkeys.closeModal',
    scope: 'modal',
    customizable: false,
  },
]

// Create a map for quick lookup
export const HOTKEY_MAP = new Map<string, HotkeyDefinition>(
  HOTKEY_DEFINITIONS.map((def) => [def.id, def])
)

// Get definitions by scope
export function getHotkeysByScope(scope: HotkeyScope): HotkeyDefinition[] {
  return HOTKEY_DEFINITIONS.filter((def) => def.scope === scope)
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useHotkeysStore = create<HotkeysState>()(
  persist(
    (set, get) => ({
      customBindings: {},

      setBinding: (actionId: string, keys: string) => {
        const definition = HOTKEY_MAP.get(actionId)
        if (!definition?.customizable) return

        set((state) => ({
          customBindings: {
            ...state.customBindings,
            [actionId]: keys,
          },
        }))
      },

      resetBinding: (actionId: string) => {
        set((state) => {
          const newBindings = { ...state.customBindings }
          delete newBindings[actionId]
          return { customBindings: newBindings }
        })
      },

      resetAllBindings: () => {
        set({ customBindings: {} })
      },

      getKeys: (actionId: string) => {
        const { customBindings } = get()
        if (customBindings[actionId]) {
          return customBindings[actionId]
        }
        const definition = HOTKEY_MAP.get(actionId)
        return definition?.defaultKeys ?? ''
      },
    }),
    {
      name: 'enjoy-hotkeys',
      partialize: (state) => ({
        customBindings: state.customBindings,
      }),
    }
  )
)

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get the current keys for a hotkey action
 */
export function useHotkeyBinding(actionId: string): string {
  const getKeys = useHotkeysStore((state) => state.getKeys)
  return getKeys(actionId)
}

