/**
 * PitchContourControls Component
 *
 * Control buttons for toggling visibility of pitch contour chart elements.
 */

import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PitchContourVisibility } from './pitch-contour-chart'
import type { EchoRegionAnalysisResult } from '@/lib/audio/echo-region-analysis'

interface PitchContourControlsProps {
  visibility: PitchContourVisibility
  onVisibilityChange: (visibility: PitchContourVisibility) => void
  analysis: EchoRegionAnalysisResult
}

export function PitchContourControls({
  visibility,
  onVisibilityChange,
  analysis,
}: PitchContourControlsProps) {
  const { t } = useTranslation()

  const hasUserData = analysis.points.some(
    (p) => p.ampUser !== undefined || p.pitchUserHz !== undefined
  )

  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* Reference toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() =>
              onVisibilityChange({ ...visibility, showReference: !visibility.showReference })
            }
            className={cn(
              'size-6 rounded border transition-colors',
              visibility.showReference
                ? ''
                : 'bg-transparent border-(--highlight-active-foreground)/30 hover:border-(--highlight-active-foreground)/50'
            )}
            style={
              visibility.showReference
                ? {
                    backgroundColor: 'var(--color-pitch-reference)',
                    borderColor: 'var(--color-pitch-reference)',
                  }
                : undefined
            }
            aria-label={t('player.transcript.pitchContourToggleReference')}
          />
        </TooltipTrigger>
        <TooltipContent>{t('player.transcript.pitchContourToggleReference')}</TooltipContent>
      </Tooltip>

      {/* User recording toggle */}
      {hasUserData && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onVisibilityChange({ ...visibility, showUser: !visibility.showUser })}
              className={cn(
                'size-6 rounded border transition-colors',
                visibility.showUser
                  ? ''
                  : 'bg-transparent border-(--highlight-active-foreground)/30 hover:border-(--highlight-active-foreground)/50'
              )}
              style={
                visibility.showUser
                  ? {
                      backgroundColor: 'var(--color-pitch-recording)',
                      borderColor: 'var(--color-pitch-recording)',
                    }
                  : undefined
              }
              aria-label={t('player.transcript.pitchContourToggleUser')}
            />
          </TooltipTrigger>
          <TooltipContent>{t('player.transcript.pitchContourToggleUser')}</TooltipContent>
        </Tooltip>
      )}

      {/* Waveform toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() =>
              onVisibilityChange({ ...visibility, showWaveform: !visibility.showWaveform })
            }
            className={cn(
              'p-1 rounded transition-colors',
              visibility.showWaveform
                ? 'text-highlight-active-foreground bg-(--highlight-active-foreground)/10'
                : 'text-(--highlight-active-foreground)/50 hover:text-(--highlight-active-foreground)/70 hover:bg-(--highlight-active-foreground)/5'
            )}
            aria-label={t('player.transcript.pitchContourToggleWaveform')}
          >
            <Icon icon="lucide:waveform" className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {visibility.showWaveform
            ? t('player.transcript.pitchContourHideWaveform')
            : t('player.transcript.pitchContourShowWaveform')}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

