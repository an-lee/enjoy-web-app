import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import type { ModelOption } from '@/ai/providers/local/constants'
import type { ModelStatus } from '@/stores/local-models'

interface ModelSelectorProps {
  availableModels: ModelOption[]
  currentModel: string
  modelStatus: ModelStatus | null
  onModelChange: (modelValue: string) => void
}

export function ModelSelector({
  availableModels,
  currentModel,
  modelStatus,
  onModelChange,
}: ModelSelectorProps) {
  const { t } = useTranslation()

  const displayName =
    availableModels.find((m) => m.value === currentModel)?.label ||
    modelStatus?.modelName ||
    currentModel ||
    t('settings.ai.noModel', { defaultValue: 'Not loaded' })

  return (
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
            {displayName}
          </span>
          <Icon icon="lucide:chevron-down" className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {availableModels.map((model) => (
          <DropdownMenuItem
            key={model.value}
            onClick={() => onModelChange(model.value)}
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
  )
}

