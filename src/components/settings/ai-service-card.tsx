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
import { localModelService } from '@/services/ai/local'
import type { AIProvider } from '@/services/ai/types'
import { useState, useEffect } from 'react'
import { Loader2, Download, CheckCircle2, AlertCircle, Circle, Info, ChevronDown } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ASR_MODEL_OPTIONS,
  SMART_TRANSLATION_MODEL_OPTIONS,
  getDefaultModel,
} from '@/services/ai/local/constants'

interface AIServiceCardProps {
  service: 'smartTranslation' | 'tts' | 'asr' | 'dictionary' | 'assessment'
  title: string
  description: string
  providers: AIProvider[]
}

// Map service types to model types
const SERVICE_TO_MODEL_TYPE: Record<string, 'asr' | 'smartTranslation' | 'dictionary' | 'tts'> = {
  asr: 'asr',
  smartTranslation: 'smartTranslation',
  dictionary: 'dictionary',
  tts: 'tts',
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

  // Get service config with fallback to default
  const serviceConfig = aiServices[service as keyof typeof aiServices] as any
  const currentProvider = serviceConfig?.defaultProvider || 'enjoy' // Default to 'enjoy' if not set
  const isLocal = currentProvider === 'local'
  const modelType = SERVICE_TO_MODEL_TYPE[service]
  const modelStatus = modelType ? models[modelType] : null

  // Get available models for this service
  const availableModels =
    modelType === 'asr'
      ? ASR_MODEL_OPTIONS
      : modelType === 'smartTranslation'
        ? SMART_TRANSLATION_MODEL_OPTIONS
        : []

  // Get current selected model or default
  const currentModel =
    (modelType &&
      (modelType === 'asr' || modelType === 'smartTranslation') &&
      serviceConfig?.localModel) ||
    (modelType && (modelType === 'asr' || modelType === 'smartTranslation')
      ? getDefaultModel(modelType)
      : '')

  // Check model status when switching to local
  useEffect(() => {
    if (isLocal && modelType && !modelStatus?.loaded && !modelStatus?.loading) {
      // Optionally check status from worker
      // This would require sending a message to the worker
    }
  }, [isLocal, modelType, modelStatus])

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

    setInitializing(true)
    setModelLoading(modelType, true)

    try {
      if (modelType === 'asr' || modelType === 'smartTranslation') {
        await localModelService.initializeModel(modelType, { model: currentModel })
      } else {
        throw new Error(t('settings.ai.modelNotSupported', { defaultValue: 'Model type not supported for local execution' }))
      }
    } catch (error: any) {
      setModelError(modelType, error.message || 'Failed to initialize model')
    } finally {
      setInitializing(false)
    }
  }

  const handleModelChange = (modelValue: string) => {
    if (modelType) {
      updateLocalModel(service, modelValue)
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
              value={currentProvider || 'enjoy'}
              onValueChange={(value) => {
                updateAIServiceProvider(service, value as AIProvider)
              }}
            >
              <SelectTrigger id={`${service}-provider`} className="w-full max-w-sm">
                <SelectValue placeholder={t('settings.ai.selectProvider', { defaultValue: 'Select provider' })} />
              </SelectTrigger>
              <SelectContent>
                {providers.includes('enjoy') && (
                  <SelectItem value="enjoy">
                    {t('settings.ai.providers.enjoy', { defaultValue: 'Enjoy API' })}
                  </SelectItem>
                )}
                {providers.includes('local') && (
                  <SelectItem value="local">
                    {t('settings.ai.providers.local', { defaultValue: 'Local (Free)' })}
                  </SelectItem>
                )}
                {providers.includes('byok') && (
                  <SelectItem value="byok" disabled>
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
                  <AlertDescription className="text-xs">{modelStatus.error}</AlertDescription>
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
                          {availableModels.find((m) => m.value === currentModel)?.label ||
                            modelStatus?.modelName ||
                            currentModel ||
                            t('settings.ai.noModel', { defaultValue: 'Not loaded' })}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {availableModels.map((model) => (
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
                        {!modelStatus?.loaded && !modelStatus?.loading && (
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
                      {!modelStatus?.loaded && !modelStatus?.loading && (
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

              {/* Progress bar - show when loading */}
              {modelStatus?.progress && (modelStatus?.loading || !modelStatus?.loaded) && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{modelStatus.progress.file || t('settings.ai.downloading', { defaultValue: 'Downloading...' })}</span>
                    {modelStatus.progress.progress !== undefined && (
                      <span className="shrink-0 ml-2">{Math.min(100, Math.round(modelStatus.progress.progress * 100))}%</span>
                    )}
                  </div>
                  {modelStatus.progress.progress !== undefined && (
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, modelStatus.progress.progress * 100)}%` }}
                      />
                    </div>
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

