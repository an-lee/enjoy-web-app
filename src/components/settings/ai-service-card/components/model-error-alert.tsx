import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import type { ModelStatus } from '@/stores/local-models'
import type { ModelType } from '@/stores/local-models'

interface ModelErrorAlertProps {
  modelStatus: ModelStatus | null
  modelType: ModelType | null | undefined
}

export function ModelErrorAlert({ modelStatus, modelType }: ModelErrorAlertProps) {
  const { t } = useTranslation()

  if (!modelStatus?.error) return null

  return (
    <Alert variant="destructive" className="py-2">
      <Icon icon="lucide:alert-circle" className="h-4 w-4" />
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
  )
}

