/**
 * PlayerContainer - Global player container that manages player modes
 *
 * This component should be placed in the root layout to enable
 * media playback across all pages.
 *
 * Modes:
 * - mini: Mini player bar at the bottom (handled by MiniPlayerBar)
 * - expanded: Full-screen player (handled by ExpandedPlayer)
 *
 * Each mode component now manages its own media loading and playback logic.
 */

import { usePlayerUIStore } from '@/page/stores/player/player-ui-store'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { PlayerMediaProvider } from './player-media-context'
import { MiniPlayerBar } from './mini-player-bar'
import { ExpandedPlayer } from './expanded-player'
import { PlayerHotkeys } from './player-hotkeys'
import { usePlayerSettingsSync } from '@/page/hooks/player/use-player-settings-sync'
import { useProgressSync } from '@/page/hooks/player/use-progress-sync'
import { useEchoSync } from '@/page/hooks/player/use-echo-sync'

// ============================================================================
// Component
// ============================================================================

export function PlayerContainer() {
  const mode = usePlayerUIStore((s) => s.mode)
  const currentSession = usePlayerSessionStore((s) => s.currentSession)

  // Sync hooks - handle side effects for persistence
  // These hooks automatically sync state changes to the database
  usePlayerSettingsSync()
  useProgressSync()
  useEchoSync()

  if (!currentSession) return null

  return (
    <PlayerMediaProvider>
      {/* Player hotkeys - active when player is visible (mini or expanded) */}
      <PlayerHotkeys />

      {/* Mini player bar - shown in mini mode */}
      {/* MiniPlayerBar now manages its own media loading and playback */}
      {mode === 'mini' && <MiniPlayerBar />}

      {/* Full player - shown in expanded mode */}
      {/* ExpandedPlayer manages its own media loading and playback */}
      {mode === 'expanded' && <ExpandedPlayer />}
    </PlayerMediaProvider>
  )
}

