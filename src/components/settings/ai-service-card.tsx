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
import { useTranslation } from 'react-i18next'
import { useSettingsStore, useLocalModelsStore } from '@/stores'
import { localModelService } from '@/services/ai/local-models'
import type { AIProvider } from '@/services/ai/types'
import { useState, useEffect } from 'react'
import { Loader2, Download, CheckCircle2, AlertCircle, Circle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AIServiceCardProps {
  service: 'translation' | 'tts' | 'asr' | 'dictionary' | 'assessment'
  title: string
  description: string
  providers: AIProvider[]
}

// Map service types to model types
const SERVICE_TO_MODEL_TYPE: Record<string, 'asr' | 'translation' | 'dictionary' | 'tts'> = {
  asr: 'asr',
  translation: 'translation',
  dictionary: 'dictionary',
  tts: 'tts',
}

// Default model names
const DEFAULT_ASR_MODEL = 'Xenova/whisper-tiny'
const DEFAULT_TRANSLATION_MODEL = 'Xenova/nllb-200-distilled-600M'

export function AIServiceCard({
  service,
  title,
  description,
  providers,
}: AIServiceCardProps) {
  const { t } = useTranslation()
  const { aiServices, updateAIServiceProvider } = useSettingsStore()
  const { models, setModelLoading, setModelError } = useLocalModelsStore()
  const [initializing, setInitializing] = useState(false)

  const currentProvider = aiServices[service].defaultProvider
  const isLocal = currentProvider === 'local'
  const modelType = SERVICE_TO_MODEL_TYPE[service]
  const modelStatus = modelType ? models[modelType] : null

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
    if (!modelType) return

    setInitializing(true)
    setModelLoading(modelType, true)

    try {
      if (modelType === 'asr' || modelType === 'translation') {
        await localModelService.initializeModel(modelType)
      } else {
        throw new Error(t('settings.ai.modelNotSupported', { defaultValue: 'Model type not supported for local execution' }))
      }
    } catch (error: any) {
      setModelError(modelType, error.message || 'Failed to initialize model')
    } finally {
      setInitializing(false)
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
              value={currentProvider}
              onValueChange={(value) => updateAIServiceProvider(service, value as AIProvider)}
            >
              <SelectTrigger id={`${service}-provider`} className="w-full max-w-sm">
                <SelectValue />
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

          {/* Show model status when Local is selected */}
          {isLocal && modelType && (
            <div className="space-y-2 pt-2 border-t">
              <Label>
                {t('settings.ai.modelStatus', { defaultValue: 'Model Status' })}
              </Label>

              {modelStatus?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{modelStatus.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('settings.ai.currentModel', { defaultValue: 'Current Model' })}:
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs ${
                        modelStatus?.loaded
                          ? 'text-foreground'
                          : 'text-muted-foreground opacity-50'
                      }`}
                    >
                      {modelStatus?.modelName ||
                        (modelType === 'asr'
                          ? DEFAULT_ASR_MODEL
                          : modelType === 'translation'
                            ? DEFAULT_TRANSLATION_MODEL
                            : t('settings.ai.noModel', { defaultValue: 'Not loaded' }))}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
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
                </div>

                {modelStatus?.progress && !modelStatus?.loaded && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{modelStatus.progress.file || t('settings.ai.downloading', { defaultValue: 'Downloading...' })}</span>
                      {modelStatus.progress.progress !== undefined && (
                        <span>{Math.min(100, Math.round(modelStatus.progress.progress * 100))}%</span>
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

                {!modelStatus?.loaded && !modelStatus?.loading && (
                  <Button
                    onClick={handleInitializeModel}
                    disabled={initializing}
                    className="w-full"
                    variant="outline"
                  >
                    {initializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('settings.ai.initializing', { defaultValue: 'Initializing...' })}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        {t('settings.ai.downloadModel', { defaultValue: 'Download & Load Model' })}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

