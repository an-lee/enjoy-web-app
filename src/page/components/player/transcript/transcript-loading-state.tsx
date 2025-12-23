/**
 * TranscriptLoadingState Component
 *
 * Loading state display for transcript component.
 */

import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'

interface TranscriptLoadingStateProps {
  className?: string
}

export function TranscriptLoadingState({ className }: TranscriptLoadingStateProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full',
        className
      )}
    >
      <Icon
        icon="lucide:loader-2"
        className="w-8 h-8 animate-spin text-muted-foreground"
      />
      <p className="mt-3 text-sm text-muted-foreground">
        {t('common.loading')}
      </p>
    </div>
  )
}

