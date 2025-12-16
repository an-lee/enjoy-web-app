/**
 * PlayerHotkeys - Keyboard shortcuts for the player
 *
 * This component should be rendered whenever the player is visible
 * (either mini or expanded mode) to enable keyboard controls.
 */

import { useAppHotkey } from '@/components/hotkeys'
import { usePlayerStore } from '@/stores/player'
import { useDisplayTime } from '@/hooks/use-display-time'
import { useTranscriptDisplay } from './transcript/use-transcript-display'
import { useEchoRegion } from './transcript/use-echo-region'
import { usePlayerControls } from '@/hooks/use-player-controls'

interface PlayerHotkeysProps {
  // No props needed - component gets all data from hooks
}

export function PlayerHotkeys({}: PlayerHotkeysProps) {
  const displayTime = useDisplayTime()
  const {
    collapse,
    expand,
    mode,
    echoModeActive,
    playbackRate,
    setPlaybackRate,
  } = usePlayerStore()

  // Get transcript data for echo region handlers
  const { lines } = useTranscriptDisplay(displayTime)

  // Get all player controls from unified hook
  const controls = usePlayerControls()

  // Get echo region handlers
  const {
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  } = useEchoRegion(lines)

  // Play/Pause
  useAppHotkey(
    'player.togglePlay',
    (e) => {
      e.preventDefault()
      controls.onTogglePlay()
    },
    { deps: [controls.onTogglePlay], preventDefault: true }
  )

  // Toggle player expand/collapse
  useAppHotkey(
    'player.toggleExpand',
    (e) => {
      e.preventDefault()
      if (mode === 'expanded') {
        collapse()
      } else if (mode === 'mini') {
        expand()
      }
    },
    { deps: [mode, collapse, expand], preventDefault: true }
  )

  // Play previous line (A)
  useAppHotkey(
    'player.prevLine',
    (e) => {
      e.preventDefault()
      controls.handlePrevLine()
    },
    { deps: [controls.handlePrevLine], preventDefault: true }
  )

  // Play next line (D)
  useAppHotkey(
    'player.nextLine',
    (e) => {
      e.preventDefault()
      controls.handleNextLine()
    },
    { deps: [controls.handleNextLine], preventDefault: true }
  )

  // Replay current line (S)
  useAppHotkey(
    'player.replayLine',
    (e) => {
      e.preventDefault()
      controls.handleReplayLine()
    },
    { deps: [controls.handleReplayLine], preventDefault: true }
  )

  // Toggle Echo mode (E)
  useAppHotkey(
    'player.toggleEchoMode',
    (e) => {
      e.preventDefault()
      controls.handleEchoMode()
    },
    { deps: [controls.handleEchoMode], preventDefault: true }
  )

  // Toggle dictation mode (H) - placeholder for future implementation
  useAppHotkey(
    'player.toggleDictationMode',
    (e) => {
      e.preventDefault()
      // TODO: Implement dictation mode toggle
      console.log('Toggle dictation mode - not yet implemented')
    },
    { deps: [], preventDefault: true }
  )

  // Toggle recording (R)
  const { toggleRecording } = usePlayerStore()
  useAppHotkey(
    'player.toggleRecording',
    async (e) => {
      e.preventDefault()
      await toggleRecording()
    },
    { deps: [toggleRecording], preventDefault: true }
  )

  // Toggle pronunciation assessment (V) - placeholder for future implementation
  useAppHotkey(
    'player.toggleAssessment',
    (e) => {
      e.preventDefault()
      // TODO: Implement assessment visibility toggle
      console.log('Toggle pronunciation assessment - not yet implemented')
    },
    { deps: [], preventDefault: true }
  )

  // Slow down playback speed (<)
  useAppHotkey(
    'player.slowDown',
    (e) => {
      e.preventDefault()
      const newRate = Math.max(0.25, playbackRate - 0.05)
      setPlaybackRate(newRate)
    },
    { deps: [playbackRate, setPlaybackRate], preventDefault: true }
  )

  // Speed up playback speed (>)
  useAppHotkey(
    'player.speedUp',
    (e) => {
      e.preventDefault()
      const newRate = Math.min(2, playbackRate + 0.05)
      setPlaybackRate(newRate)
    },
    { deps: [playbackRate, setPlaybackRate], preventDefault: true }
  )

  // Expand Echo region backward ([) - only when echo mode is active
  useAppHotkey(
    'player.expandEchoBackward',
    (e) => {
      e.preventDefault()
      if (echoModeActive) {
        handleExpandEchoBackward()
      }
    },
    { deps: [echoModeActive, handleExpandEchoBackward], preventDefault: true }
  )

  // Expand Echo region forward (]) - only when echo mode is active
  useAppHotkey(
    'player.expandEchoForward',
    (e) => {
      e.preventDefault()
      if (echoModeActive) {
        handleExpandEchoForward()
      }
    },
    { deps: [echoModeActive, handleExpandEchoForward], preventDefault: true }
  )

  // Shrink Echo region backward ({) - only when echo mode is active
  useAppHotkey(
    'player.shrinkEchoBackward',
    (e) => {
      e.preventDefault()
      if (echoModeActive) {
        handleShrinkEchoBackward()
      }
    },
    { deps: [echoModeActive, handleShrinkEchoBackward], preventDefault: true }
  )

  // Shrink Echo region forward (}) - only when echo mode is active
  useAppHotkey(
    'player.shrinkEchoForward',
    (e) => {
      e.preventDefault()
      if (echoModeActive) {
        handleShrinkEchoForward()
      }
    },
    { deps: [echoModeActive, handleShrinkEchoForward], preventDefault: true }
  )

  return null
}

