import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import { useSettingsStore, useLocalModelsStore } from '@/stores'
import type { ModelType } from '@/stores/local-models'
import { localModelService } from '@/services/ai/providers/local'
import { AIProvider, AIServiceType } from '@/services/ai/types'
import { useState, useEffect } from 'react'
import { Loader2, Download, CheckCircle2, AlertCircle, Circle, Info, ChevronDown } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ASR_MODEL_OPTIONS,
  SMART_TRANSLATION_MODEL_OPTIONS,
  DICTIONARY_MODEL_OPTIONS,
  TTS_MODEL_OPTIONS,
  getDefaultModel,
  type ModelOption,
} from '@/services/ai/providers/local/constants'

interface AIServiceCardProps {
  service: AIServiceType
  title: string
  description: string
  providers: (AIProvider | string)[]
}

// Map service types to model types
const SERVICE_TO_MODEL_TYPE: Partial<Record<AIServiceType, ModelType>> = {
  [AIServiceType.ASR]: 'asr',
  [AIServiceType.SMART_TRANSLATION]: 'smartTranslation',
  [AIServiceType.DICTIONARY]: 'dictionary',
  [AIServiceType.TTS]: 'tts',
}


export function AIServiceCard({
  service,
  title,
  description,
  providers,
}: AIServiceCardProps) {
  const { t } = useTranslation()
  const { aiServices, updateAIServiceProvider, updateLocalModel } = useSettingsStore()
  const { models, setModelLoading, setModelError } = useLocalModelsStore()
  const [initializing, setInitializing] = useState(false)
  const [loadingFromCache, setLoadingFromCache] = useState(false)

  // Get service config with fallback to default
  // AIServiceType values match AIServiceSettings keys
  const serviceKey = service as keyof typeof aiServices
  const serviceConfig = aiServices[serviceKey] as any
  const currentProvider = (serviceConfig?.defaultProvider || AIProvider.ENJOY) as AIProvider // Default to 'enjoy' if not set
  const isLocal = currentProvider === AIProvider.LOCAL
  const modelType = SERVICE_TO_MODEL_TYPE[service]
  const modelStatus = modelType ? models[modelType] : null

  // Get available models for this service
  const availableModels =
    modelType === 'asr'
      ? ASR_MODEL_OPTIONS
      : modelType === 'smartTranslation'
        ? SMART_TRANSLATION_MODEL_OPTIONS
        : modelType === 'dictionary'
          ? DICTIONARY_MODEL_OPTIONS
          : modelType === 'tts'
            ? TTS_MODEL_OPTIONS
            : []

  // Get current selected model or default
  const currentModel =
    (modelType &&
      (modelType === 'asr' || modelType === 'smartTranslation' || modelType === 'dictionary' || modelType === 'tts') &&
      serviceConfig?.localModel) ||
    (modelType && (modelType === 'asr' || modelType === 'smartTranslation' || modelType === 'dictionary' || modelType === 'tts')
      ? getDefaultModel(modelType)
      : '')

  // Check model cache status when switching models
  const [isCached, setIsCached] = useState<boolean | null>(null)

  useEffect(() => {
    if (isLocal && modelType && currentModel && !modelStatus?.loaded && !modelStatus?.loading) {
      // First check if model is already loaded in worker
      localModelService
        .checkModelLoaded(modelType, { model: currentModel })
        .then((workerStatus) => {
          if (workerStatus.loaded && workerStatus.modelName === currentModel) {
            // Model is already loaded in worker, update state
            useLocalModelsStore.getState().setModelLoaded(modelType, currentModel)
            setIsCached(null) // Don't show cache status if already loaded
          } else {
            // Check if model is cached
            return localModelService.checkModelCache(modelType, { model: currentModel })
          }
        })
        .then((cached) => {
          if (typeof cached === 'boolean') {
            setIsCached(cached)
          }
        })
        .catch(() => {
          setIsCached(false)
        })
    } else {
      setIsCached(null)
    }
  }, [isLocal, modelType, currentModel, modelStatus?.loaded, modelStatus?.loading])

  // Clear progress when model is loaded
  useEffect(() => {
    if (modelStatus?.loaded && modelStatus?.progress && modelType) {
      // Clear progress after a short delay to allow UI to update
      const timer = setTimeout(() => {
        useLocalModelsStore.getState().setModelProgress(modelType, undefined)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [modelStatus?.loaded, modelType])

  const handleInitializeModel = async () => {
    if (!modelType || !currentModel) return

    // First check if model is already loaded in worker
    try {
      const workerStatus = await localModelService.checkModelLoaded(modelType, { model: currentModel })
      if (workerStatus.loaded && workerStatus.modelName === currentModel) {
        // Model is already loaded, just update state
        useLocalModelsStore.getState().setModelLoaded(modelType, currentModel)
        setInitializing(false)
        return
      }
    } catch (error) {
      console.warn('[AIServiceCard] Failed to check worker status:', error)
    }

    setInitializing(true)
    setModelLoading(modelType, true)

    try {
      // Check if model is cached before loading
      const cached = await localModelService.checkModelCache(modelType, { model: currentModel })
      if (cached) {
        // Model is cached, loading should be fast
        setLoadingFromCache(true)
        console.log(`[AIServiceCard] Model ${currentModel} is cached, loading from cache...`)
      } else {
        setLoadingFromCache(false)
      }

      if (modelType === 'asr' || modelType === 'smartTranslation' || modelType === 'dictionary' || modelType === 'tts') {
        await localModelService.initializeModel(modelType, { model: currentModel })
      } else {
        throw new Error(
          t('settings.ai.modelNotSupported', { defaultValue: 'Model type not supported for local execution' })
        )
      }
    } catch (error: any) {
      // Log detailed error for debugging
      console.error('[AIServiceCard] Model initialization error')
      console.error('Model type:', modelType)
      console.error('Current model:', currentModel)
      console.error('Error object:', error)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)
      console.error('Error name:', error?.name)
      console.error('Error cause:', error?.cause)
      console.error('Error string:', String(error))
      try {
        console.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      } catch (e) {
        console.error('Cannot stringify error:', e)
      }

      const errorMessage = error?.message || error?.toString() || 'Failed to initialize model'
      setModelError(modelType, errorMessage)
    } finally {
      setInitializing(false)
      setLoadingFromCache(false)
    }
  }

  const handleModelChange = async (modelValue: string) => {
    if (modelType) {
      // AIServiceType values match AIServiceSettings keys
      updateLocalModel(serviceKey, modelValue)

      // Check if the new model is already loaded in worker
      try {
        const workerStatus = await localModelService.checkModelLoaded(modelType, { model: modelValue })
        if (workerStatus.loaded && workerStatus.modelName === modelValue) {
          // Model is already loaded in worker, update state directly
          useLocalModelsStore.getState().setModelLoaded(modelType, modelValue)
          return
        }
      } catch (error) {
        console.warn('[AIServiceCard] Failed to check worker status:', error)
      }

      // If model is already loaded but different model is selected, reset status
      if (modelStatus?.loaded && modelStatus.modelName !== modelValue) {
        useLocalModelsStore.getState().resetModel(modelType)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${service}-provider`}>
              {t('settings.ai.provider', { defaultValue: 'Provider' })}
            </Label>
            <Select
              value={currentProvider || AIProvider.ENJOY}
              onValueChange={(value) => {
                // AIServiceType values match AIServiceSettings keys
                updateAIServiceProvider(serviceKey, value as AIProvider)
              }}
            >
              <SelectTrigger id={`${service}-provider`} className="w-full max-w-sm">
                <SelectValue placeholder={t('settings.ai.selectProvider', { defaultValue: 'Select provider' })} />
              </SelectTrigger>
              <SelectContent>
                {providers.includes(AIProvider.ENJOY) && (
                  <SelectItem value={AIProvider.ENJOY}>
                    {t('settings.ai.providers.enjoy', { defaultValue: 'Enjoy API' })}
                  </SelectItem>
                )}
                {providers.includes(AIProvider.LOCAL) && (
                  <SelectItem value={AIProvider.LOCAL}>
                    {t('settings.ai.providers.local', { defaultValue: 'Local (Free)' })}
                  </SelectItem>
                )}
                {providers.includes(AIProvider.BYOK) && (
                  <SelectItem value={AIProvider.BYOK} disabled>
                    {t('settings.ai.providers.byok', { defaultValue: 'BYOK (Coming Soon)' })}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Show model selection and status when Local is selected */}
          {isLocal && modelType && availableModels.length > 0 && (
            <div className="space-y-3 pt-3 border-t">
              {modelStatus?.error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <div className="font-medium">{modelStatus.error}</div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        {t('settings.ai.showErrorDetails', { defaultValue: 'Show error details' })}
                      </summary>
                      <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(
                          {
                            error: modelStatus.error,
                            errorDetails: modelStatus.errorDetails,
                            modelType,
                            modelName: modelStatus.modelName,
                            loaded: modelStatus.loaded,
                            loading: modelStatus.loading,
                          },
                          null,
                          2
                        )}
                      </pre>
                      {modelStatus.errorDetails?.stack && (
                        <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded overflow-auto max-h-40 font-mono">
                          {modelStatus.errorDetails.stack}
                        </pre>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t('settings.ai.errorDebugHint', {
                          defaultValue: 'Check browser console (F12) for detailed error logs',
                        })}
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {/* Model selection and status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                    {t('settings.ai.currentModel', { defaultValue: 'Model' })}:
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-mono text-xs hover:bg-transparent justify-start gap-1.5 min-w-0 flex-1"
                      >
                        <span
                          className={`truncate ${
                            modelStatus?.loaded
                              ? 'text-foreground'
                              : 'text-muted-foreground opacity-50'
                          }`}
                        >
                          {availableModels.find((m: ModelOption) => m.value === currentModel)?.label ||
                            modelStatus?.modelName ||
                            currentModel ||
                            t('settings.ai.noModel', { defaultValue: 'Not loaded' })}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {availableModels.map((model: ModelOption) => (
                        <DropdownMenuItem
                          key={model.value}
                          onClick={() => handleModelChange(model.value)}
                          className="flex flex-col items-start gap-0.5"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{model.label}</span>
                            {model.size && (
                              <span className="text-xs text-muted-foreground">{model.size}</span>
                            )}
                          </div>
                          {model.description && (
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="shrink-0">
                        {modelStatus?.loading && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t('settings.ai.loading', { defaultValue: 'Loading' })}
                          </Badge>
                        )}
                        {modelStatus?.loaded && !modelStatus?.loading && (
                          <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-500">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('settings.ai.loaded', { defaultValue: 'Loaded' })}
                          </Badge>
                        )}
                        {!modelStatus?.loaded && !modelStatus?.loading && isCached === true && (
                          <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Circle className="h-3 w-3 fill-current" />
                            {t('settings.ai.cached', { defaultValue: 'Cached' })}
                          </Badge>
                        )}
                        {!modelStatus?.loaded && !modelStatus?.loading && isCached !== true && (
                          <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
                            <Circle className="h-3 w-3 fill-current" />
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
                </div>

                {/* Download button - shown on the right on larger screens, below on small screens */}
                {!modelStatus?.loaded && !modelStatus?.loading && (
                  <Button
                    onClick={handleInitializeModel}
                    disabled={initializing}
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 shrink-0 w-full sm:w-auto"
                  >
                    {initializing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs">{t('settings.ai.initializing', { defaultValue: 'Initializing...' })}</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        <span className="text-xs">{t('settings.ai.downloadModel', { defaultValue: 'Download' })}</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Progress bars - show when loading */}
              {(modelStatus?.loading || initializing) && (
                <div className="space-y-2">
                  {loadingFromCache && (!modelStatus?.files || Object.keys(modelStatus.files).length === 0) ? (
                    // Loading from cache, show simple loading indicator
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('settings.ai.loadingFromCache', { defaultValue: 'Loading from cache...' })}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full animate-pulse" style={{ width: '30%' }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const files = modelStatus?.files
                        const fileEntries = files ? Object.entries(files) : []

                        // If we have multiple files, show all of them
                        if (fileEntries.length > 0) {
                      // Sort files: in-progress first, then completed
                      const sortedFiles = [...fileEntries].sort(([, a], [, b]) => {
                        const aComplete = a.progress >= 1.0
                        const bComplete = b.progress >= 1.0
                        if (aComplete && !bComplete) return 1
                        if (!aComplete && bComplete) return -1
                        return 0
                      })

                      return sortedFiles.map(([fileKey, fileProgress]) => {
                        const fileName = fileProgress.name.includes('/')
                          ? fileProgress.name.split('/').pop() || fileProgress.name
                          : fileProgress.name
                        const progressPercent = Math.min(100, Math.max(0, fileProgress.progress * 100))
                        const isComplete = fileProgress.progress >= 1.0
                        const fileSize = fileProgress.size
                          ? fileProgress.size > 1024 * 1024
                            ? `${(fileProgress.size / (1024 * 1024)).toFixed(2)} MB`
                            : fileProgress.size > 1024
                              ? `${(fileProgress.size / 1024).toFixed(2)} KB`
                              : `${fileProgress.size} B`
                          : null
                        const loadedSize = fileProgress.loaded && fileProgress.size
                          ? fileProgress.loaded > 1024 * 1024
                            ? `${(fileProgress.loaded / (1024 * 1024)).toFixed(2)} MB`
                            : fileProgress.loaded > 1024
                              ? `${(fileProgress.loaded / 1024).toFixed(2)} KB`
                              : `${fileProgress.loaded} B`
                          : null

                        return (
                          <div key={fileKey} className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className={`truncate font-mono ${isComplete ? 'text-green-600 dark:text-green-400' : ''}`} title={fileProgress.name}>
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
                              <span className={`shrink-0 ml-2 ${isComplete ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
                                {isComplete ? t('settings.ai.completed', { defaultValue: 'Completed' }) : `${Math.round(progressPercent)}%`}
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
                      })
                    }

                      // Fallback to legacy single file progress
                      const progress = modelStatus?.progress
                      if (progress) {
                      const fileName = (progress as any)?.file || (progress as any)?.filename || (progress as any)?.name
                      const status = progress.status || (progress as any)?.message || (progress as any)?.text
                      const progressPercent = progress.progress !== undefined
                        ? Math.min(100, Math.max(0, progress.progress * 100))
                        : undefined

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate">
                              {fileName
                                ? (typeof fileName === 'string' && fileName.includes('/')
                                    ? fileName.split('/').pop()
                                    : fileName)
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
                      )
                    }

                        // No progress data yet
                        return (
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
                        )
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* Performance warning */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{t('settings.ai.localModelPerformanceWarning', {
                  defaultValue:
                    'Local models require high computer performance. If your device has low specifications, they may not work properly.',
                })}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

