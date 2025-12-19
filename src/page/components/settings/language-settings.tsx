import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Label } from '@/page/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/page/components/ui/select'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/page/stores'
import { LANGUAGES } from '@/page/lib/constants'

export function LanguageSettings() {
  const { t } = useTranslation()
  const { nativeLanguage, learningLanguage, setNativeLanguage, setLearningLanguage } = useSettingsStore()

  return (
    <div className="space-y-6">
      {/* Native Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.nativeLanguage')}</CardTitle>
          <CardDescription>
            {t('settings.nativeLanguageDescription', { defaultValue: 'Your native language (used as translation target language)' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="native-language">{t('settings.nativeLanguage')}</Label>
            <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
              <SelectTrigger id="native-language" className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Learning Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.learningLanguage')}</CardTitle>
          <CardDescription>
            {t('settings.learningLanguageDescription', { defaultValue: 'The language you are currently learning' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="learning-language">{t('settings.learningLanguage')}</Label>
            <Select value={learningLanguage} onValueChange={setLearningLanguage}>
              <SelectTrigger id="learning-language" className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
