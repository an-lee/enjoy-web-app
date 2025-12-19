/**
 * ShadowReadingPanelHeader Component
 *
 * Header section of the shadow reading panel showing title and duration.
 */

import { Icon } from '@iconify/react'
import { formatTime } from '@/shared/lib/utils'
import { useTranslation } from 'react-i18next'

interface ShadowReadingPanelHeaderProps {
  duration: number
}

export function ShadowReadingPanelHeader({ duration }: ShadowReadingPanelHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon icon="lucide:mic" className="w-5 h-5 text-highlight-active-foreground" />
        <h3 className="text-base font-semibold text-highlight-active-foreground">
          {t('player.transcript.shadowReading')}
        </h3>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-(--highlight-active-foreground)/70">
        <Icon icon="lucide:clock" className="w-4 h-4" />
        <span className="tabular-nums font-medium">{formatTime(duration/1000)}</span>
      </div>
    </div>
  )
}

