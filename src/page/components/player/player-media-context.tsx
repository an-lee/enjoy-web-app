/**
 * PlayerMediaContext - React Context for media element controls
 *
 * Provides media element ref and control functions to child components.
 * This replaces the previous pattern of storing refs in Zustand store.
 *
 * Components should register their media element ref using registerMediaRef().
 */

import { createContext, useContext, useRef, useEffect, useState, useCallback, useMemo } from 'react'
import type { RefObject } from 'react'
import { usePlayerSessionStore } from '@/page/stores/player/player-session-store'
import { usePlayerEchoStore } from '@/page/stores/player/player-echo-store'
import { usePlayerUIStore } from '@/page/stores/player/player-ui-store'
import { setDisplayTime } from '@/page/hooks/player/use-display-time'
import {
  clampSeekTimeToEchoWindow,
  normalizeEchoWindow,
  type EchoWindow,
} from '@/page/components/player/echo'

export interface MediaControls {
  seek: (time: number) => void
  play: () => Promise<void>
  pause: () => void
  getCurrentTime: () => number
  isPaused: () => boolean
}

interface PlayerMediaContextValue {
  mediaRef: RefObject<HTMLAudioElement | HTMLVideoElement | null>
  controls: MediaControls | null
  registerMediaRef: (ref: RefObject<HTMLAudioElement | HTMLVideoElement | null>) => void
  unregisterMediaRef: () => void
}

const PlayerMediaContext = createContext<PlayerMediaContextValue | null>(null)

interface PlayerMediaProviderProps {
  children: React.ReactNode
}

export function PlayerMediaProvider({ children }: PlayerMediaProviderProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const registeredRefRef = useRef<RefObject<HTMLAudioElement | HTMLVideoElement | null> | null>(null)
  const [controls, setControls] = useState<MediaControls | null>(null)
  const [refUpdateTrigger, setRefUpdateTrigger] = useState(0)

  // Register/unregister media ref from child components
  const registerMediaRef = useCallback((ref: RefObject<HTMLAudioElement | HTMLVideoElement | null>) => {
    registeredRefRef.current = ref
    // Trigger update to check for media element
    setRefUpdateTrigger((prev) => prev + 1)
  }, [])

  const unregisterMediaRef = useCallback(() => {
    registeredRefRef.current = null
    setRefUpdateTrigger((prev) => prev + 1)
  }, [])

  // Get state from stores
  const currentSession = usePlayerSessionStore((s) => s.currentSession)
  const updateProgress = usePlayerSessionStore((s) => s.updateProgress)
  const echoModeActive = usePlayerEchoStore((s) => s.echoModeActive)
  const echoStartTime = usePlayerEchoStore((s) => s.echoStartTime)
  const echoEndTime = usePlayerEchoStore((s) => s.echoEndTime)
  const setPlaying = usePlayerUIStore((s) => s.setPlaying)

  // Memoize echo window to prevent unnecessary recalculations
  const echoWindow: EchoWindow | null = useMemo(
    () =>
      normalizeEchoWindow({
        active: echoModeActive,
        startTimeSeconds: echoStartTime,
        endTimeSeconds: echoEndTime,
        durationSeconds: currentSession?.duration,
      }),
    [echoModeActive, echoStartTime, echoEndTime, currentSession?.duration]
  )

  // Create controls when media element is available
  useEffect(() => {
    const el = registeredRefRef.current?.current || null
    if (!el) {
      setControls(null)
      return
    }

    // Create stable control functions that capture current values
    const mediaControls: MediaControls = {
      seek: (time: number) => {
        const nextTime = echoWindow
          ? clampSeekTimeToEchoWindow(time, echoWindow)
          : time
        el.currentTime = nextTime
        setDisplayTime(nextTime)
        updateProgress(nextTime)
      },
      play: async () => {
        await el.play()
        setPlaying(true)
      },
      pause: () => {
        el.pause()
        setPlaying(false)
        updateProgress(el.currentTime)
      },
      getCurrentTime: () => {
        return el.currentTime
      },
      isPaused: () => {
        return el.paused
      },
    }

    setControls(mediaControls)
    // Only depend on refUpdateTrigger and echoWindow
    // updateProgress and setPlaying are stable functions from Zustand stores
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refUpdateTrigger, echoWindow])

  return (
    <PlayerMediaContext.Provider value={{ mediaRef, controls, registerMediaRef, unregisterMediaRef }}>
      {children}
    </PlayerMediaContext.Provider>
  )
}

export function usePlayerMedia() {
  const context = useContext(PlayerMediaContext)
  if (!context) {
    throw new Error('usePlayerMedia must be used within PlayerMediaProvider')
  }
  return context
}

