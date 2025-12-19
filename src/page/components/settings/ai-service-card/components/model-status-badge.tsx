import { Badge } from '@/page/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/page/components/ui/tooltip'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import type { ModelStatus } from '@/page/stores/local-models'

interface ModelStatusBadgeProps {
  modelStatus: ModelStatus | null
  isCached: boolean | null
}

export function ModelStatusBadge({ modelStatus, isCached }: ModelStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0">
          {modelStatus?.loading && (
            <Badge variant="secondary" className="gap-1">
              <Icon icon="lucide:loader-2" className="h-3 w-3 animate-spin" />
              {t('settings.ai.loading', { defaultValue: 'Loading' })}
            </Badge>
          )}
          {modelStatus?.loaded && !modelStatus?.loading && (
            <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-500">
              <Icon icon="lucide:check-circle-2" className="h-3 w-3" />
              {t('settings.ai.loaded', { defaultValue: 'Loaded' })}
            </Badge>
          )}
          {!modelStatus?.loaded && !modelStatus?.loading && isCached === true && (
            <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Icon icon="lucide:circle" className="h-3 w-3 fill-current" />
              {t('settings.ai.cached', { defaultValue: 'Cached' })}
            </Badge>
          )}
          {!modelStatus?.loaded && !modelStatus?.loading && isCached !== true && (
            <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
              <Icon icon="lucide:circle" className="h-3 w-3 fill-current" />
              {t('settings.ai.notLoaded', { defaultValue: 'Not loaded' })}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {modelStatus?.loading && (
          <p>{t('settings.ai.loadingTooltip', { defaultValue: 'Model is being downloaded and loaded' })}</p>
        )}
        {modelStatus?.loaded && !modelStatus?.loading && (
          <p>{t('settings.ai.loadedTooltip', { defaultValue: 'Model is ready to use' })}</p>
        )}
        {!modelStatus?.loaded && !modelStatus?.loading && isCached === true && (
          <p>{t('settings.ai.cachedTooltip', { defaultValue: 'Model files are cached. Click Download to load from cache (fast)' })}</p>
        )}
        {!modelStatus?.loaded && !modelStatus?.loading && isCached !== true && (
          <p>{t('settings.ai.notLoadedTooltip', { defaultValue: 'Model needs to be downloaded and loaded before use' })}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

