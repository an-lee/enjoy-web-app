import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'

export function PerformanceWarning() {
  const { t } = useTranslation()

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>
        {t('settings.ai.localModelPerformanceWarning', {
          defaultValue:
            'Local models require high computer performance. If your device has low specifications, they may not work properly.',
        })}
      </span>
    </div>
  )
}

