import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/page/components/ui/card'
import { Input } from '@/page/components/ui/input'
import { Label } from '@/page/components/ui/label'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/page/stores'

export function GeneralSettings() {
  const { t } = useTranslation()
  const { dailyGoal, setDailyGoal } = useSettingsStore()

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

