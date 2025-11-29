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
import { AIServiceCard } from './ai-service-card'

interface AISettingsProps {
  searchQuery: string
  settingsByCategory: {
    ai: any[]
  }
}

export function AISettings({ searchQuery, settingsByCategory }: AISettingsProps) {
  const { t } = useTranslation()

  if (settingsByCategory.ai.length === 0 && searchQuery) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            {t('settings.noResults', { defaultValue: 'No settings found' })}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'fastTranslation')) && (
        <AIServiceCard
          service="fastTranslation"
          title={t('settings.ai.fastTranslation', { defaultValue: 'Fast Translation' })}
          description={t('settings.ai.fastTranslationDescription', { defaultValue: 'Fast translation optimized for subtitle translation. Uses dedicated translation models for speed.' })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'smartTranslation')) && (
        <AIServiceCard
          service="smartTranslation"
          title={t('settings.ai.smartTranslation', { defaultValue: 'Smart Translation' })}
          description={t('settings.ai.smartTranslationDescription', { defaultValue: 'Smart translation with style support. Uses generative models for user-generated content translation.' })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'tts')) && (
        <AIServiceCard
          service="tts"
          title={t('settings.ai.tts')}
          description={t('settings.ai.ttsDescription', { defaultValue: 'Configure text-to-speech service provider' })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'asr')) && (
        <AIServiceCard
          service="asr"
          title={t('settings.ai.asr')}
          description={t('settings.ai.asrDescription', { defaultValue: 'Configure automatic speech recognition service provider' })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'dictionary')) && (
        <AIServiceCard
          service="dictionary"
          title={t('settings.ai.dictionary')}
          description={t('settings.ai.dictionaryDescription', { defaultValue: 'Configure dictionary lookup service provider' })}
          providers={['enjoy', 'local', 'byok']}
        />
      )}

      {(!searchQuery || settingsByCategory.ai.some(s => s.id === 'assessment')) && (
        <AIServiceCard
          service="assessment"
          title={t('settings.ai.assessment')}
          description={t('settings.ai.assessmentDescription', { defaultValue: 'Configure pronunciation assessment service provider' })}
          providers={['enjoy', 'byok']}
        />
      )}
    </>
  )
}

