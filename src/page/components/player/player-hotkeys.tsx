/**
 * PlayerHotkeys - Keyboard shortcuts for the player
 *
 * This component should be rendered whenever the player is visible
 * (either mini or expanded mode) to enable keyboard controls.
 */

import { useRef, useEffect } from 'react'
import { useAppHotkey } from '@/page/components/hotkeys'
import { usePlayerUIStore } from '@/page/stores/player/player-ui-store'
import { usePlayerEchoStore } from '@/page/stores/player/player-echo-store'
import { usePlayerSettingsStore } from '@/page/stores/player/player-settings-store'
import { usePlayerRecordingStore } from '@/page/stores/player/player-recording-store'
import { useEchoRegionOperations, usePlayerControls, useTranscriptDisplay } from '@/page/hooks/player'

export function PlayerHotkeys() {
  const collapse = usePlayerUIStore((s) => s.collapse)
  const expand = usePlayerUIStore((s) => s.expand)
  const mode = usePlayerUIStore((s) => s.mode)
  const echoModeActive = usePlayerEchoStore((s) => s.echoModeActive)
  const playbackRate = usePlayerSettingsStore((s) => s.playbackRate)
  const setPlaybackRate = usePlayerSettingsStore((s) => s.setPlaybackRate)

  // Get all player controls from unified hook
  const controls = usePlayerControls()

  // Get transcript lines for echo region operations
  const { lines } = useTranscriptDisplay()

  // Get echo region handlers with lines for expand/shrink operations
  const {
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  } = useEchoRegionOperations(lines)

  // Use refs to store all handlers to prevent infinite re-renders
  // These functions may change when state changes, but we don't want
  // to re-register hotkeys every time they change
  const controlsRef = useRef(controls)
  const echoHandlersRef = useRef({
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  })

  // Update refs when handlers change
  useEffect(() => {
    controlsRef.current = controls
  }, [controls])

  useEffect(() => {
    echoHandlersRef.current = {
      handleExpandEchoForward,
      handleExpandEchoBackward,
      handleShrinkEchoForward,
      handleShrinkEchoBackward,
    }
  }, [
    handleExpandEchoForward,
    handleExpandEchoBackward,
    handleShrinkEchoForward,
    handleShrinkEchoBackward,
  ])

  // Play/Pause
  useAppHotkey(
    'player.togglePlay',
    (e) => {
      e.preventDefault()
      controlsRef.current.onTogglePlay()
    },
    { deps: [], preventDefault: true }
  )

  // Store stable references to collapse/expand functions and mode
  const collapseRef = useRef(collapse)
  const expandRef = useRef(expand)
  const modeRef = useRef(mode)
  useEffect(() => {
    collapseRef.current = collapse
    expandRef.current = expand
    modeRef.current = mode
  }, [collapse, expand, mode])

  // Toggle player expand/collapse
  useAppHotkey(
    'player.toggleExpand',
    (e) => {
      e.preventDefault()
      if (modeRef.current === 'expanded') {
        collapseRef.current()
      } else if (modeRef.current === 'mini') {
        expandRef.current()
      }
    },
    { deps: [], preventDefault: true }
  )

  // Play previous line (A)
  useAppHotkey(
    'player.prevLine',
    (e) => {
      e.preventDefault()
      controlsRef.current.handlePrevLine()
    },
    { deps: [], preventDefault: true }
  )

  // Play next line (D)
  useAppHotkey(
    'player.nextLine',
    (e) => {
      e.preventDefault()
      controlsRef.current.handleNextLine()
    },
    { deps: [], preventDefault: true }
  )

  // Replay current line (S)
  useAppHotkey(
    'player.replayLine',
    (e) => {
      e.preventDefault()
      controlsRef.current.handleReplayLine()
    },
    { deps: [], preventDefault: true }
  )

  // Toggle Echo mode (E)
  useAppHotkey(
    'player.toggleEchoMode',
    (e) => {
      e.preventDefault()
      controlsRef.current.handleEchoMode()
    },
    { deps: [], preventDefault: true }
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
  const toggleRecording = usePlayerRecordingStore((s) => s.toggleRecording)
  const toggleRecordingPlayback = usePlayerRecordingStore((s) => s.toggleRecordingPlayback)
  const toggleRecordingRef = useRef(toggleRecording)
  const toggleRecordingPlaybackRef = useRef(toggleRecordingPlayback)
  useEffect(() => {
    toggleRecordingRef.current = toggleRecording
    toggleRecordingPlaybackRef.current = toggleRecordingPlayback
  }, [toggleRecording, toggleRecordingPlayback])

  useAppHotkey(
    'player.toggleRecording',
    async (e) => {
      e.preventDefault()
      await toggleRecordingRef.current()
    },
    { deps: [], preventDefault: true }
  )

  // Play/Pause recording (G)
  useAppHotkey(
    'player.playRecording',
    (e) => {
      e.preventDefault()
      toggleRecordingPlaybackRef.current()
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

  // Store stable references to setPlaybackRate
  const setPlaybackRateRef = useRef(setPlaybackRate)
  const playbackRateRef = useRef(playbackRate)
  useEffect(() => {
    setPlaybackRateRef.current = setPlaybackRate
    playbackRateRef.current = playbackRate
  }, [setPlaybackRate, playbackRate])

  // Slow down playback speed (<)
  useAppHotkey(
    'player.slowDown',
    (e) => {
      e.preventDefault()
      const newRate = Math.max(0.25, playbackRateRef.current - 0.05)
      setPlaybackRateRef.current(newRate)
    },
    { deps: [], preventDefault: true }
  )

  // Speed up playback speed (>)
  useAppHotkey(
    'player.speedUp',
    (e) => {
      e.preventDefault()
      const newRate = Math.min(2, playbackRateRef.current + 0.05)
      setPlaybackRateRef.current(newRate)
    },
    { deps: [], preventDefault: true }
  )

  // Store echoModeActive in ref to avoid re-registering hotkeys
  const echoModeActiveRef = useRef(echoModeActive)
  useEffect(() => {
    echoModeActiveRef.current = echoModeActive
  }, [echoModeActive])

  // Expand Echo region backward ([) - only when echo mode is active
  useAppHotkey(
    'player.expandEchoBackward',
    (e) => {
      e.preventDefault()
      if (echoModeActiveRef.current) {
        echoHandlersRef.current.handleExpandEchoBackward()
      }
    },
    { deps: [], preventDefault: true }
  )

  // Expand Echo region forward (]) - only when echo mode is active
  useAppHotkey(
    'player.expandEchoForward',
    (e) => {
      e.preventDefault()
      if (echoModeActiveRef.current) {
        echoHandlersRef.current.handleExpandEchoForward()
      }
    },
    { deps: [], preventDefault: true }
  )

  // Shrink Echo region backward ({) - only when echo mode is active
  useAppHotkey(
    'player.shrinkEchoBackward',
    (e) => {
      e.preventDefault()
      if (echoModeActiveRef.current) {
        echoHandlersRef.current.handleShrinkEchoBackward()
      }
    },
    { deps: [], preventDefault: true }
  )

  // Shrink Echo region forward (}) - only when echo mode is active
  useAppHotkey(
    'player.shrinkEchoForward',
    (e) => {
      e.preventDefault()
      if (echoModeActiveRef.current) {
        echoHandlersRef.current.handleShrinkEchoForward()
      }
    },
    { deps: [], preventDefault: true }
  )

  return null
}

