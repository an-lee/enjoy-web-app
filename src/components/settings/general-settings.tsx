import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores'

interface GeneralSettingsProps {
  searchQuery: string
  settingsByCategory: {
    general: any[]
  }
}

export function GeneralSettings({ searchQuery, settingsByCategory }: GeneralSettingsProps) {
  const { t } = useTranslation()
  const { dailyGoal, setDailyGoal } = useSettingsStore()

  if (settingsByCategory.general.length === 0 && searchQuery) {
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

  if (searchQuery && settingsByCategory.general.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.dailyGoal')}</CardTitle>
        <CardDescription>
          {t('settings.dailyGoalDescription', { defaultValue: 'Set your daily practice goal in minutes' })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="dailyGoal">{t('settings.dailyGoal')}</Label>
          <Input
            id="dailyGoal"
            type="number"
            min="0"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            className="w-full max-w-sm"
          />
          <p className="text-sm text-muted-foreground">
            {t('settings.minutes', { defaultValue: 'minutes per day' })}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

