/**
 * HotkeysProvider - Global hotkeys context provider
 *
 * Wraps the application with react-hotkeys-hook's HotkeysProvider
 * and manages scope activation based on application state.
 */

import { HotkeysProvider as RHHProvider, useHotkeysContext } from 'react-hotkeys-hook'
import { useEffect, type ReactNode } from 'react'
import { usePlayerStore } from '@/page/stores/player'
import { createLogger } from '@/lib/utils'

const log = createLogger({ name: 'HotkeysScope' })

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
  const { enableScope, disableScope, activeScopes } = useHotkeysContext()
  const playerMode = usePlayerStore((state) => state.mode)

  // Log active scopes on mount
  useEffect(() => {
    log.debug('Active scopes:', activeScopes)
  }, [activeScopes])

  useEffect(() => {
    // Player scope: active when player is visible (mini or expanded)
    if (playerMode === 'expanded' || playerMode === 'mini') {
      log.debug('Enabling player scope')
      enableScope('player')
    } else {
      log.debug('Disabling player scope')
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

