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
    expand,
    mode,
    echoModeActive,
    activateEchoMode,
    deactivateEchoMode,
    playbackRate,
    setPlaybackRate,
  } = usePlayerStore()

  const duration = currentSession?.duration ?? 0

  // Get transcript data for line navigation
  const { lines, activeLineIndex } = useTranscriptDisplay(displayTime)

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

  // Play previous line (A)
  useAppHotkey(
    'player.prevLine',
    (e) => {
      e.preventDefault()
      if (lines.length === 0 || activeLineIndex < 0) return

      // Find previous line
      const prevIndex = activeLineIndex > 0 ? activeLineIndex - 1 : 0
      const prevLine = lines[prevIndex]
      if (prevLine) {
        if (echoModeActive) {
          activateEchoMode(
            prevIndex,
            prevIndex,
            prevLine.startTimeSeconds,
            prevLine.endTimeSeconds
          )
        }
        onSeek(prevLine.startTimeSeconds)
      }
    },
    { deps: [lines, activeLineIndex, onSeek, echoModeActive, activateEchoMode], preventDefault: true }
  )

  // Play next line (D)
  useAppHotkey(
    'player.nextLine',
    (e) => {
      e.preventDefault()
      if (lines.length === 0) return

      // Find next line
      const nextIndex = activeLineIndex < lines.length - 1 ? activeLineIndex + 1 : lines.length - 1
      const nextLine = lines[nextIndex]
      if (nextLine) {
        if (echoModeActive) {
          activateEchoMode(
            nextIndex,
            nextIndex,
            nextLine.startTimeSeconds,
            nextLine.endTimeSeconds
          )
        }
        onSeek(nextLine.startTimeSeconds)
      }
    },
    { deps: [lines, activeLineIndex, onSeek, echoModeActive, activateEchoMode], preventDefault: true }
  )

  // Replay current line (S)
  useAppHotkey(
    'player.replayLine',
    (e) => {
      e.preventDefault()
      if (lines.length === 0 || activeLineIndex < 0) return

      const currentLine = lines[activeLineIndex]
      if (currentLine) {
        if (echoModeActive) {
          activateEchoMode(
            activeLineIndex,
            activeLineIndex,
            currentLine.startTimeSeconds,
            currentLine.endTimeSeconds
          )
        }
        onSeek(currentLine.startTimeSeconds)
      }
    },
    { deps: [lines, activeLineIndex, onSeek, echoModeActive, activateEchoMode], preventDefault: true }
  )

  // Toggle Echo mode (E)
  useAppHotkey(
    'player.toggleEchoMode',
    (e) => {
      e.preventDefault()
      if (echoModeActive) {
        deactivateEchoMode()
      } else {
        // Activate echo mode based on current active line
        if (activeLineIndex >= 0 && activeLineIndex < lines.length) {
          const line = lines[activeLineIndex]
          activateEchoMode(
            activeLineIndex,
            activeLineIndex,
            line.startTimeSeconds,
            line.endTimeSeconds
          )
        }
      }
    },
    { deps: [echoModeActive, activeLineIndex, lines, activateEchoMode, deactivateEchoMode], preventDefault: true }
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

  // Toggle recording (R) - placeholder for future implementation
  useAppHotkey(
    'player.toggleRecording',
    (e) => {
      e.preventDefault()
      // TODO: Implement recording toggle
      console.log('Toggle recording - not yet implemented')
    },
    { deps: [], preventDefault: true }
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

