/**
 * PitchContourControls Component
 *
 * Control buttons for toggling visibility of pitch contour chart elements.
 */

import { Icon } from '@iconify/react'
import { cn } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/page/components/ui/tooltip'
import type { PitchContourVisibility } from './pitch-contour-chart'
import type { EchoRegionAnalysisResult } from '@/page/lib/audio/echo-region-analysis'
import { Separator } from '@/page/components/ui/separator'

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
              'size-4 rounded-full transition-colors cursor-pointer',
              visibility.showReference
                ? 'bg-pitch-reference'
                : 'bg-pitch-reference/30'
            )}
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
                'size-4 rounded-full transition-colors cursor-pointer',
                visibility.showUser
                  ? 'bg-pitch-recording'
                  : 'bg-pitch-recording/30'
              )}
              aria-label={t('player.transcript.pitchContourToggleUser')}
            />
          </TooltipTrigger>
          <TooltipContent>{t('player.transcript.pitchContourToggleUser')}</TooltipContent>
        </Tooltip>
      )}

      <Separator orientation="vertical" />

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
            <Icon icon="lucide:audio-waveform" className="size-4" />
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

