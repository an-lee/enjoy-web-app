import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores'
import type { AIProvider } from '@/services/ai/types'

interface AIServiceCardProps {
  service: 'translation' | 'tts' | 'asr' | 'dictionary' | 'assessment'
  title: string
  description: string
  providers: AIProvider[]
}

export function AIServiceCard({
  service,
  title,
  description,
  providers,
}: AIServiceCardProps) {
  const { t } = useTranslation()
  const { aiServices, updateAIServiceProvider } = useSettingsStore()

  const currentProvider = aiServices[service].defaultProvider

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

