/**
 * PlayerHotkeys - Keyboard shortcuts for the player
 *
 * This component should be rendered whenever the player is visible
 * (either mini or expanded mode) to enable keyboard controls.
 */

import { useAppHotkey } from '@/components/hotkeys'
import { usePlayerStore } from '@/stores/player'
import { useDisplayTime } from './player-container'

interface PlayerHotkeysProps {
  onTogglePlay: () => void
  onSeek: (time: number) => void
}

export function PlayerHotkeys({ onTogglePlay, onSeek }: PlayerHotkeysProps) {
  const displayTime = useDisplayTime()
  const {
    currentSession,
    volume,
    setVolume,
    collapse,
    mode,
  } = usePlayerStore()

  const duration = currentSession?.duration ?? 0

  // Play/Pause
  useAppHotkey(
    'player.togglePlay',
    (e) => {
      e.preventDefault()
      onTogglePlay()
    },
    { deps: [onTogglePlay], preventDefault: true }
  )

  // Seek backward 5s
  useAppHotkey(
    'player.seekBackward',
    (e) => {
      e.preventDefault()
      const newTime = Math.max(0, displayTime - 5)
      onSeek(newTime)
    },
    { deps: [displayTime, onSeek], preventDefault: true }
  )

  // Seek forward 5s
  useAppHotkey(
    'player.seekForward',
    (e) => {
      e.preventDefault()
      const newTime = Math.min(duration, displayTime + 5)
      onSeek(newTime)
    },
    { deps: [displayTime, duration, onSeek], preventDefault: true }
  )

  // Volume up
  useAppHotkey(
    'player.volumeUp',
    (e) => {
      e.preventDefault()
      setVolume(Math.min(1, volume + 0.1))
    },
    { deps: [volume, setVolume], preventDefault: true }
  )

  // Volume down
  useAppHotkey(
    'player.volumeDown',
    (e) => {
      e.preventDefault()
      setVolume(Math.max(0, volume - 0.1))
    },
    { deps: [volume, setVolume], preventDefault: true }
  )

  // Toggle mute
  useAppHotkey(
    'player.toggleMute',
    (e) => {
      e.preventDefault()
      setVolume(volume > 0 ? 0 : 1)
    },
    { deps: [volume, setVolume], preventDefault: true }
  )

  // Collapse player (only when expanded)
  useAppHotkey(
    'player.collapse',
    (e) => {
      e.preventDefault()
      if (mode === 'expanded') {
        collapse()
      }
    },
    { deps: [mode, collapse], preventDefault: true }
  )

  // Replay segment (go back 3 seconds)
  useAppHotkey(
    'player.replaySegment',
    (e) => {
      e.preventDefault()
      const newTime = Math.max(0, displayTime - 3)
      onSeek(newTime)
    },
    { deps: [displayTime, onSeek], preventDefault: true }
  )

  return null
}

