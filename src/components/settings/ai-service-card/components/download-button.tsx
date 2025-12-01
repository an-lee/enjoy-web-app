import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import type { ModelStatus } from '@/stores/local-models'

interface DownloadButtonProps {
  modelStatus: ModelStatus | null
  initializing: boolean
  onDownload: () => void
}

export function DownloadButton({ modelStatus, initializing, onDownload }: DownloadButtonProps) {
  const { t } = useTranslation()

  if (modelStatus?.loaded || modelStatus?.loading) return null

  return (
    <Button
      onClick={onDownload}
      disabled={initializing}
      size="sm"
      variant="outline"
      className="h-7 gap-1.5 shrink-0 w-full sm:w-auto"
    >
      {initializing ? (
        <>
          <Icon icon="lucide:loader-2" className="h-3 w-3 animate-spin" />
          <span className="text-xs">{t('settings.ai.initializing', { defaultValue: 'Initializing...' })}</span>
        </>
      ) : (
        <>
          <Icon icon="lucide:download" className="h-3 w-3" />
          <span className="text-xs">{t('settings.ai.downloadModel', { defaultValue: 'Download' })}</span>
        </>
      )}
    </Button>
  )
}

