import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/page/stores'
import { AIProvider, AIServiceType } from '@/ai/types'
import { ProviderSelector } from './components/provider-selector'
import { ModelErrorAlert } from './components/model-error-alert'
import { ModelSelector } from './components/model-selector'
import { ModelStatusBadge } from './components/model-status-badge'
import { ModelProgress } from './components/model-progress'
import { DownloadButton } from './components/download-button'
import { PerformanceWarning } from './components/performance-warning'
import { useModelStatus } from '@/page/hooks/use-model-status'
import { SERVICE_TO_MODEL_TYPE, getAvailableModels, getCurrentModel } from './utils'

interface AIServiceCardProps {
  service: AIServiceType
  title: string
  description: string
  providers: (AIProvider | string)[]
}

export function AIServiceCard({
  service,
  title,
  description,
  providers,
}: AIServiceCardProps) {
  const { t } = useTranslation()
  const { aiServices, updateAIServiceProvider, updateLocalModel } = useSettingsStore()

  // Get service config with fallback to default
  // AIServiceType values match AIServiceSettings keys
  const serviceKey = service as keyof typeof aiServices
  const serviceConfig = aiServices[serviceKey] as any
  const currentProvider = (serviceConfig?.defaultProvider || AIProvider.ENJOY) as AIProvider
  const isLocal = currentProvider === AIProvider.LOCAL
  const modelType = SERVICE_TO_MODEL_TYPE[service]

  // Get available models and current model
  const availableModels = getAvailableModels(modelType)
  const currentModel = getCurrentModel(modelType, serviceConfig)

  // Use model status hook
  const {
    modelStatus,
    initializing,
    loadingFromCache,
    isCached,
    handleInitializeModel,
    handleModelChange,
  } = useModelStatus({
    isLocal,
    modelType,
    currentModel,
  })

  const handleProviderChange = (provider: AIProvider) => {
    updateAIServiceProvider(serviceKey, provider)
  }

  const handleModelChangeWithUpdate = async (modelValue: string) => {
    updateLocalModel(serviceKey, modelValue)
    await handleModelChange(modelValue)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ProviderSelector
            service={service}
            currentProvider={currentProvider}
            providers={providers}
            onProviderChange={handleProviderChange}
          />

          {/* Show model selection and status when Local is selected */}
          {isLocal && modelType && availableModels.length > 0 && (
            <div className="space-y-3 pt-3 border-t">
              <ModelErrorAlert modelStatus={modelStatus} modelType={modelType} />

              {/* Model selection and status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                    {t('settings.ai.currentModel', { defaultValue: 'Model' })}:
                  </span>
                  <ModelSelector
                    availableModels={availableModels}
                    currentModel={currentModel}
                    modelStatus={modelStatus}
                    onModelChange={handleModelChangeWithUpdate}
                  />
                  <ModelStatusBadge modelStatus={modelStatus} isCached={isCached} />
                </div>

                <DownloadButton
                  modelStatus={modelStatus}
                  initializing={initializing}
                  onDownload={handleInitializeModel}
                />
              </div>

              {/* Progress bars - show when loading */}
              <ModelProgress
                modelStatus={modelStatus}
                loadingFromCache={loadingFromCache}
                initializing={initializing}
              />

              {/* Performance warning */}
              <PerformanceWarning />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

