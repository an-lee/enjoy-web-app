import { useTranslation } from 'react-i18next'
import type { ModelStatus } from '@/page/stores/local-models'
import { formatFileSize, extractFileName } from '../utils'

interface ModelProgressProps {
  modelStatus: ModelStatus | null
  loadingFromCache: boolean
  initializing: boolean
}

export function ModelProgress({ modelStatus, loadingFromCache, initializing }: ModelProgressProps) {
  const { t } = useTranslation()

  if (!modelStatus?.loading && !initializing) return null

  // Loading from cache without file progress
  if (loadingFromCache && (!modelStatus?.files || Object.keys(modelStatus.files).length === 0)) {
    return (
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('settings.ai.loadingFromCache', { defaultValue: 'Loading from cache...' })}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full animate-pulse" style={{ width: '30%' }} />
          </div>
        </div>
      </div>
    )
  }

  const files = modelStatus?.files
  const fileEntries = files ? Object.entries(files) : []

  // Multiple files progress
  if (fileEntries.length > 0) {
    // Sort files: in-progress first, then completed
    const sortedFiles = [...fileEntries].sort(([, a], [, b]) => {
      const aComplete = a.progress >= 1.0
      const bComplete = b.progress >= 1.0
      if (aComplete && !bComplete) return 1
      if (!aComplete && bComplete) return -1
      return 0
    })

    return (
      <div className="space-y-2">
        {sortedFiles.map(([fileKey, fileProgress]) => {
          const fileName = extractFileName(fileProgress.name)
          const progressPercent = Math.min(100, Math.max(0, fileProgress.progress * 100))
          const isComplete = fileProgress.progress >= 1.0
          const fileSize = fileProgress.size ? formatFileSize(fileProgress.size) : null
          const loadedSize =
            fileProgress.loaded && fileProgress.size
              ? formatFileSize(fileProgress.loaded)
              : null

          return (
            <div key={fileKey} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span
                  className={`truncate font-mono ${isComplete ? 'text-green-600 dark:text-green-400' : ''}`}
                  title={fileProgress.name}
                >
                  {fileName}
                  {fileSize && (
                    <span className="ml-1.5 text-muted-foreground/70">
                      {isComplete ? (
                        <span className="text-green-600 dark:text-green-400">({fileSize})</span>
                      ) : (
                        `(${loadedSize && `${loadedSize} / `}${fileSize})`
                      )}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 ml-2 ${isComplete ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}
                >
                  {isComplete
                    ? t('settings.ai.completed', { defaultValue: 'Completed' })
                    : `${Math.round(progressPercent)}%`}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-green-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Legacy single file progress
  const progress = modelStatus?.progress
  if (progress) {
    const fileName = (progress as any)?.file || (progress as any)?.filename || (progress as any)?.name
    const status = progress.status || (progress as any)?.message || (progress as any)?.text
    const progressPercent =
      progress.progress !== undefined
        ? Math.min(100, Math.max(0, progress.progress * 100))
        : undefined

    return (
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">
              {fileName
                ? typeof fileName === 'string' && fileName.includes('/')
                  ? fileName.split('/').pop()
                  : fileName
                : status || t('settings.ai.downloading', { defaultValue: 'Downloading...' })}
            </span>
            {progressPercent !== undefined && (
              <span className="shrink-0 ml-2">{Math.round(progressPercent)}%</span>
            )}
          </div>
          {progressPercent !== undefined ? (
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : (
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full animate-pulse" style={{ width: '30%' }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // No progress data yet
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {loadingFromCache
              ? t('settings.ai.loadingFromCache', { defaultValue: 'Loading from cache...' })
              : t('settings.ai.downloading', { defaultValue: 'Downloading...' })}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full animate-pulse" style={{ width: '30%' }} />
        </div>
      </div>
    </div>
  )
}

