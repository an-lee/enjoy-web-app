import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings'
import { useTheme } from '@/components/theme-provider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

const languages = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
]

function Settings() {
  const { t } = useTranslation()
  const { preferredLanguage, setPreferredLanguage } = useSettingsStore()
  const { theme, setTheme } = useTheme()

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.description', { defaultValue: 'Manage your application settings' })}
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.theme')}</CardTitle>
            <CardDescription>
              {t('settings.themeDescription', { defaultValue: 'Choose your preferred theme' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="cursor-pointer">
                  {t('settings.themeLight', { defaultValue: 'Light' })}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="cursor-pointer">
                  {t('settings.themeDark', { defaultValue: 'Dark' })}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="cursor-pointer">
                  {t('settings.themeSystem', { defaultValue: 'System' })}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
            <CardDescription>
              {t('settings.languageDescription', { defaultValue: 'Choose your preferred language' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="language">{t('settings.language')}</Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger id="language" className="w-full max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
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
    </div>
  )
}
