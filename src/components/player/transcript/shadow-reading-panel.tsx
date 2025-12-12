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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

  const [pitchOpen, setPitchOpen] = useState(false)
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
    if (!pitchOpen) return

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
  }, [pitchOpen, cacheKey])

  return (
    <div className="bg-shadow-panel text-shadow-panel-foreground border-t border-(--shadow-panel-foreground)/30 rounded-b-lg shadow-sm px-4 py-4 -mt-1">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:mic" className="w-5 h-5 text-shadow-panel-foreground" />
          <h3 className="text-base font-semibold text-shadow-panel-foreground">
            {t('player.transcript.shadowReading')}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-(--shadow-panel-foreground)/70">
          <Icon icon="lucide:clock" className="w-4 h-4" />
          <span className="tabular-nums font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="grid gap-4">
        <p className="text-sm text-(--shadow-panel-foreground)/75 leading-relaxed">
          {t('player.transcript.shadowReadingHint')}
        </p>

        {/* Pitch contour */}
        <div className="flex items-center justify-center gap-3">
          {/* Pitch contour button */}
          <Dialog open={pitchOpen} onOpenChange={setPitchOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="btn-text cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-(--shadow-panel-foreground)/80 hover:text-shadow-panel-foreground hover:bg-(--shadow-panel-foreground)/10 rounded-md transition-all hover:border-(--shadow-panel-foreground)/30"
              >
                <Icon icon="lucide:activity" className="w-4 h-4" />
                <span>{t('player.transcript.showPitchContour')}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{t('player.transcript.pitchContourTitle')}</DialogTitle>
                <DialogDescription>
                  {t('player.transcript.pitchContourDescription')}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3">
                {status === 'loading' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                    <span>{t('player.transcript.pitchContourLoading')}</span>
                  </div>
                )}

                {status === 'error' && (
                  <div className="grid gap-2">
                    <div className="text-sm text-destructive">
                      {t('player.transcript.pitchContourError')} {analysisError}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={runAnalysis}>
                        {t('player.transcript.pitchContourRetry')}
                      </Button>
                    </div>
                  </div>
                )}

                {status === 'ready' && analysis && (
                  <>
                    <PitchContourChart
                      data={analysis.points}
                      className="w-full"
                      labels={{
                        waveform: t('player.transcript.pitchContourWaveform'),
                        pitch: t('player.transcript.pitchContourPitch'),
                        yourWaveform: t('player.transcript.pitchContourYourWaveform'),
                        yourPitch: t('player.transcript.pitchContourYourPitch'),
                      }}
                    />
                    <div className="text-xs text-muted-foreground">
                      {t('player.transcript.pitchContourMeta', {
                        sampleRate: Math.round(analysis.meta.sampleRate),
                        essentiaVersion: analysis.meta.essentiaVersion ?? 'unknown',
                      })}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Record button */}
        <div className="flex items-center justify-center gap-3">
          {/* Record button - using shadow panel foreground color */}
          <button
            type="button"
            onClick={onRecord}
            className={cn(
              'flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all',
              'shadow-sm hover:shadow-md',
              isRecording
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-shadow-panel-foreground text-shadow-panel hover:opacity-90'
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

