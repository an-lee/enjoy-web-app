/**
 * ShadowReadingPanel Component
 *
 * Panel displayed below Echo Region when echo mode is active.
 * Provides controls for shadow reading practice.
 * Styled with soft purple tone to distinguish from Echo Region.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn, formatTime } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'
import { useDisplayTime } from '@/hooks/use-display-time'
import { Button } from '@/components/ui/button'
import type { EchoRegionAnalysisResult } from '@/lib/audio/echo-region-analysis'
import {
  analyzeEchoRegionFromBlob,
  loadMediaBlobForSession,
} from '@/lib/audio/echo-region-analysis'
import { PitchContourChart } from './pitch-contour-chart'

interface ShadowReadingPanelProps {
  startTime: number
  endTime: number
  onRecord: () => void
  isRecording: boolean
}

export function ShadowReadingPanel({
  startTime,
  endTime,
  onRecord,
  isRecording,
}: ShadowReadingPanelProps) {
  const { t } = useTranslation()
  const duration = endTime - startTime
  const currentSession = usePlayerStore((s) => s.currentSession)
  const displayTime = useDisplayTime()

  // Calculate relative time for progress indicator (0 to duration)
  const currentTimeRelative = useMemo(() => {
    if (!Number.isFinite(displayTime)) return undefined
    // Clamp to region bounds
    if (displayTime < startTime) return 0
    if (displayTime >= endTime) return duration
    return displayTime - startTime
  }, [displayTime, startTime, endTime, duration])

  const [isPitchExpanded, setIsPitchExpanded] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [analysis, setAnalysis] = useState<EchoRegionAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, EchoRegionAnalysisResult>>(new Map())

  const cacheKey = useMemo(() => {
    if (!currentSession) return null
    // Round times to milliseconds to avoid cache misses due to float noise.
    const s = Math.round(startTime * 1000)
    const e = Math.round(endTime * 1000)
    return `${currentSession.mediaType}:${currentSession.mediaId}:${s}-${e}`
  }, [currentSession, startTime, endTime])

  const runAnalysis = async () => {
    if (!currentSession) {
      setAnalysisError(t('player.transcript.pitchContourNoMedia'))
      setStatus('error')
      return
    }
    if (!cacheKey) return

    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      setAnalysis(cached)
      setStatus('ready')
      return
    }

    setStatus('loading')
    setAnalysisError(null)

    try {
      const blob = await loadMediaBlobForSession({
        mediaId: currentSession.mediaId,
        mediaType: currentSession.mediaType,
      })
      const res = await analyzeEchoRegionFromBlob({
        blob,
        startTimeSeconds: startTime,
        endTimeSeconds: endTime,
      })
      cacheRef.current.set(cacheKey, res)
      setAnalysis(res)
      setStatus('ready')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze audio'
      setAnalysisError(msg)
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!isPitchExpanded) return

    let cancelled = false
    setStatus('loading')
    setAnalysisError(null)

    ;(async () => {
      try {
        await runAnalysis()
      } finally {
        if (cancelled) return
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPitchExpanded, cacheKey])

  return (
    <div className="bg-highlight-active text-highlight-active-foreground border-t border-highlight-active-border/30 rounded-b-lg shadow-sm px-4 py-4 -mt-1">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:mic" className="w-5 h-5 text-highlight-active-foreground" />
          <h3 className="text-base font-semibold text-highlight-active-foreground">
            {t('player.transcript.shadowReading')}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-(--highlight-active-foreground)/70">
          <Icon icon="lucide:clock" className="w-4 h-4" />
          <span className="tabular-nums font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="grid gap-3">
        <p className="text-sm text-(--highlight-active-foreground)/75 leading-relaxed">
          {t('player.transcript.shadowReadingHint')}
        </p>

        {/* Pitch contour section */}
        <div className="border border-(--highlight-active-foreground)/20 rounded-lg overflow-hidden">
          {/* Pitch contour header - toggle button */}
          <button
            type="button"
            onClick={() => setIsPitchExpanded(!isPitchExpanded)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-4 py-2.5',
              'text-sm font-medium text-(--highlight-active-foreground)/90',
              'hover:bg-(--highlight-active-foreground)/5 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-(--highlight-active-foreground)/20 focus:ring-offset-1'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon icon="lucide:activity" className="w-4 h-4" />
              <span>{t('player.transcript.pitchContourTitle')}</span>
            </div>
            <Icon
              icon="lucide:chevron-down"
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isPitchExpanded && 'rotate-180'
              )}
            />
          </button>

          {/* Pitch contour content - collapsible */}
          {isPitchExpanded && (
            <div className="border-t border-(--highlight-active-foreground)/10 px-4 py-3 bg-(--highlight-active-foreground)/2">
              {status === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-(--highlight-active-foreground)/70">
                  <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                  <span>{t('player.transcript.pitchContourLoading')}</span>
                </div>
              )}

              {status === 'error' && (
                <div className="grid gap-3 py-4">
                  <div className="text-sm text-destructive">
                    {t('player.transcript.pitchContourError')} {analysisError}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={runAnalysis}
                    className="w-fit"
                  >
                    {t('player.transcript.pitchContourRetry')}
                  </Button>
                </div>
              )}

              {status === 'ready' && analysis && (
                <div className="grid gap-3">
                  <PitchContourChart
                    data={analysis.points}
                    className="w-full h-[200px]"
                    currentTimeRelative={currentTimeRelative}
                    labels={{
                      waveform: t('player.transcript.pitchContourWaveform'),
                      pitch: t('player.transcript.pitchContourPitch'),
                      yourWaveform: t('player.transcript.pitchContourYourWaveform'),
                      yourPitch: t('player.transcript.pitchContourYourPitch'),
                    }}
                  />
                  <div className="text-xs text-(--highlight-active-foreground)/60 text-center">
                    {t('player.transcript.pitchContourMeta', {
                      sampleRate: Math.round(analysis.meta.sampleRate),
                      essentiaVersion: analysis.meta.essentiaVersion ?? 'unknown',
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Record button */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onRecord}
            className={cn(
              'flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all',
              'shadow-sm hover:shadow-md',
              isRecording
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-highlight-active-foreground text-highlight-active hover:opacity-90'
            )}
          >
            <Icon
              icon={isRecording ? 'lucide:square' : 'lucide:mic'}
              className="w-5 h-5"
            />
            <span>
              {isRecording
                ? t('player.transcript.stopRecording')
                : t('player.transcript.record')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

