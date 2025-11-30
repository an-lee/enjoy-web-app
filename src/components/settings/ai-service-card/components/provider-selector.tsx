import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { AIProvider, AIServiceType } from '@/services/ai/types'

interface ProviderSelectorProps {
  service: AIServiceType
  currentProvider: AIProvider
  providers: (AIProvider | string)[]
  onProviderChange: (provider: AIProvider) => void
}

export function ProviderSelector({
  service,
  currentProvider,
  providers,
  onProviderChange,
}: ProviderSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label htmlFor={`${service}-provider`}>
        {t('settings.ai.provider', { defaultValue: 'Provider' })}
      </Label>
      <Select
        value={currentProvider || AIProvider.ENJOY}
        onValueChange={(value) => onProviderChange(value as AIProvider)}
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
  )
}

