/**
 * Player Recording Store
 *
 * Manages recording control functions registered by ShadowRecording component.
 * These are function references, not state, so they're stored separately.
 *
 * Note: This is a temporary solution. Ideally, recording controls should be
 * passed via React Context or component props, not stored in Zustand.
 */

import { create } from 'zustand'
import { createLogger } from '@/shared/lib/utils'
import { usePlayerEchoStore } from './player-echo-store'

const log = createLogger({ name: 'player-recording-store' })

interface RecordingControls {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  isRecording: () => boolean
}

interface RecordingPlayerControls {
  togglePlayback: () => void
  isPlaying: () => boolean
}

interface PlayerRecordingState {
  // Recording control functions (registered by ShadowRecording component)
  recordingControls: RecordingControls | null

  // Recording player control functions (registered by RecordingPlayer component)
  recordingPlayerControls: RecordingPlayerControls | null

  // Actions
  registerRecordingControls: (controls: RecordingControls) => void
  unregisterRecordingControls: () => void
  toggleRecording: () => Promise<void>

  registerRecordingPlayerControls: (controls: RecordingPlayerControls) => void
  unregisterRecordingPlayerControls: () => void
  toggleRecordingPlayback: () => void
}

export const usePlayerRecordingStore = create<PlayerRecordingState>((set, get) => ({
  // Initial state
  recordingControls: null,
  recordingPlayerControls: null,

  // Actions
  registerRecordingControls: (controls) => {
    set({ recordingControls: controls })
    log.debug('Recording controls registered')
  },

  unregisterRecordingControls: () => {
    set({ recordingControls: null })
    log.debug('Recording controls unregistered')
  },

  toggleRecording: async () => {
    const { recordingControls } = get()
    const echoModeActive = usePlayerEchoStore.getState().echoModeActive

    if (!recordingControls || !echoModeActive) {
      log.debug('Cannot toggle recording: no controls registered or echo mode not active')
      return
    }

    const isRecording = recordingControls.isRecording()
    if (isRecording) {
      await recordingControls.stopRecording()
      log.debug('Recording stopped via shortcut')
    } else {
      await recordingControls.startRecording()
      log.debug('Recording started via shortcut')
    }
  },

  registerRecordingPlayerControls: (controls) => {
    set({ recordingPlayerControls: controls })
    log.debug('Recording player controls registered')
  },

  unregisterRecordingPlayerControls: () => {
    set({ recordingPlayerControls: null })
    log.debug('Recording player controls unregistered')
  },

  toggleRecordingPlayback: () => {
    const { recordingPlayerControls } = get()
    const echoModeActive = usePlayerEchoStore.getState().echoModeActive

    if (!recordingPlayerControls || !echoModeActive) {
      log.debug('Cannot toggle recording playback: no player controls or echo mode not active')
      return
    }
    recordingPlayerControls.togglePlayback()
    log.debug('Recording playback toggled via shortcut')
  },
}))
