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

import { usePlayerStore } from '@/page/stores/player'
import { MiniPlayerBar } from './mini-player-bar'
import { ExpandedPlayer } from './expanded-player'
import { PlayerHotkeys } from './player-hotkeys'

// ============================================================================
// Component
// ============================================================================

export function PlayerContainer() {
  const mode = usePlayerStore((state) => state.mode)
  const currentSession = usePlayerStore((state) => state.currentSession)

  if (!currentSession) return null

  return (
    <>
      {/* Player hotkeys - active when player is visible (mini or expanded) */}
      <PlayerHotkeys />

      {/* Mini player bar - shown in mini mode */}
      {/* MiniPlayerBar now manages its own media loading and playback */}
      {mode === 'mini' && <MiniPlayerBar />}

      {/* Full player - shown in expanded mode */}
      {/* ExpandedPlayer manages its own media loading and playback */}
      {mode === 'expanded' && <ExpandedPlayer />}
    </>
  )
}

