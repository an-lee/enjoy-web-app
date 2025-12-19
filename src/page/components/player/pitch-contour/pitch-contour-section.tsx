/**
 * PitchContourSection Component
 *
 * Collapsible section for displaying pitch contour analysis.
 * Handles loading, error states, and displays the chart with controls.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/page/components/ui/button'
import { usePlayerStore } from '@/page/stores/player'
import type { EchoRegionAnalysisResult } from '@/page/lib/audio/echo-region-analysis'
import {
  analyzeEchoRegionFromBlob,
  loadMediaBlobForSession,
} from '@/page/lib/audio/echo-region-analysis'
import { PitchContourChart, type PitchContourVisibility } from './pitch-contour-chart'
import { PitchContourControls } from './pitch-contour-controls'

interface PitchContourSectionProps {
  startTime: number
  endTime: number
  currentTimeRelative?: number
}

export function PitchContourSection({
  startTime,
  endTime,
  currentTimeRelative,
}: PitchContourSectionProps) {
  const { t } = useTranslation()
  const currentSession = usePlayerStore((s) => s.currentSession)

  const [isExpanded, setIsExpanded] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [analysis, setAnalysis] = useState<EchoRegionAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<PitchContourVisibility>({
    showWaveform: true,
    showReference: true,
    showUser: true,
  })
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
    if (!isExpanded) return

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
  }, [isExpanded, cacheKey])

  return (
    <div className="border border-(--highlight-active-foreground)/20 rounded-lg overflow-hidden">
      {/* Header - toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
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
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Content - collapsible */}
      {isExpanded && (
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
                visibility={visibility}
                labels={{
                  waveform: t('player.transcript.pitchContourWaveform'),
                  pitch: t('player.transcript.pitchContourPitch'),
                  yourWaveform: t('player.transcript.pitchContourYourWaveform'),
                  yourPitch: t('player.transcript.pitchContourYourPitch'),
                }}
              />
              <PitchContourControls
                visibility={visibility}
                onVisibilityChange={setVisibility}
                analysis={analysis}
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
  )
}

