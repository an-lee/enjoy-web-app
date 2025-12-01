import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { GeneralSettings } from './general-settings'
import { AppearanceSettings } from './appearance-settings'
import { LanguageSettings } from './language-settings'
import { AISettings } from './ai-settings'

interface SettingsTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function SettingsTabs({
  activeTab,
  onTabChange,
}: SettingsTabsProps) {
  const { t } = useTranslation()

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general" className="flex items-center gap-2">
          <Icon icon="lucide:settings" className="h-4 w-4" />
          {t('settings.tabs.general', { defaultValue: 'General' })}
        </TabsTrigger>
        <TabsTrigger value="appearance" className="flex items-center gap-2">
          <Icon icon="lucide:palette" className="h-4 w-4" />
          {t('settings.tabs.appearance', { defaultValue: 'Appearance' })}
        </TabsTrigger>
        <TabsTrigger value="language" className="flex items-center gap-2">
          <Icon icon="lucide:languages" className="h-4 w-4" />
          {t('settings.tabs.language', { defaultValue: 'Language' })}
        </TabsTrigger>
        <TabsTrigger value="ai" className="flex items-center gap-2">
          <Icon icon="lucide:brain" className="h-4 w-4" />
          {t('settings.tabs.ai', { defaultValue: 'AI Services' })}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-6 mt-6">
        <GeneralSettings />
      </TabsContent>

      <TabsContent value="appearance" className="space-y-6 mt-6">
        <AppearanceSettings />
      </TabsContent>

      <TabsContent value="language" className="space-y-6 mt-6">
        <LanguageSettings />
      </TabsContent>

      <TabsContent value="ai" className="space-y-6 mt-6">
        <AISettings />
      </TabsContent>
    </Tabs>
  )
}

