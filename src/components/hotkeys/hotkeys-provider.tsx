/**
 * HotkeysProvider - Global hotkeys context provider
 *
 * Wraps the application with react-hotkeys-hook's HotkeysProvider
 * and manages scope activation based on application state.
 */

import { HotkeysProvider as RHHProvider, useHotkeysContext } from 'react-hotkeys-hook'
import { useEffect, type ReactNode } from 'react'
import { usePlayerStore } from '@/stores/player'

// ============================================================================
// Types
// ============================================================================

interface AppHotkeysProviderProps {
  children: ReactNode
}

// ============================================================================
// Scope Manager Component
// ============================================================================

/**
 * Manages hotkey scopes based on application state
 */
function ScopeManager() {
  const { enableScope, disableScope } = useHotkeysContext()
  const playerMode = usePlayerStore((state) => state.mode)

  useEffect(() => {
    // Player scope management
    if (playerMode === 'expanded') {
      enableScope('player')
    } else {
      disableScope('player')
    }
  }, [playerMode, enableScope, disableScope])

  return null
}

// ============================================================================
// Main Provider
// ============================================================================

export function AppHotkeysProvider({ children }: AppHotkeysProviderProps) {
  return (
    <RHHProvider initiallyActiveScopes={['global']}>
      <ScopeManager />
      {children}
    </RHHProvider>
  )
}

// Re-export hooks for convenience
export { useHotkeysContext } from 'react-hotkeys-hook'

