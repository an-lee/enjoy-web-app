import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useMemo } from 'react'
import { SettingsSearch, SettingsTabs } from '@/components/settings'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

interface SettingItem {
  id: string
  title: string
  description: string
  category: 'general' | 'ai' | 'appearance' | 'language'
  keywords: string[]
}

function Settings() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('general')

  // Define all settings for search
  const allSettings: SettingItem[] = useMemo(() => [
    {
      id: 'theme',
      title: t('settings.theme'),
      description: t('settings.themeDescription'),
      category: 'appearance',
      keywords: ['theme', 'dark', 'light', 'system', 'appearance', 'color'],
    },
    {
      id: 'uiLanguage',
      title: t('settings.uiLanguage'),
      description: t('settings.uiLanguageDescription'),
      category: 'appearance',
      keywords: ['ui', 'interface', 'language', 'locale', 'i18n'],
    },
    {
      id: 'nativeLanguage',
      title: t('settings.nativeLanguage'),
      description: t('settings.nativeLanguageDescription'),
      category: 'language',
      keywords: ['native', 'mother tongue', 'target language', 'translation'],
    },
    {
      id: 'learningLanguage',
      title: t('settings.learningLanguage'),
      description: t('settings.learningLanguageDescription'),
      category: 'language',
      keywords: ['learning', 'studying', 'target', 'language'],
    },
    {
      id: 'dailyGoal',
      title: t('settings.dailyGoal'),
      description: t('settings.dailyGoalDescription', { defaultValue: 'Set your daily practice goal' }),
      category: 'general',
      keywords: ['goal', 'daily', 'practice', 'target'],
    },
    {
      id: 'translation',
      title: t('settings.ai.translation'),
      description: t('settings.ai.translationDescription'),
      category: 'ai',
      keywords: ['translation', 'translate', 'ai', 'llm'],
    },
    {
      id: 'tts',
      title: t('settings.ai.tts'),
      description: t('settings.ai.ttsDescription'),
      category: 'ai',
      keywords: ['tts', 'text to speech', 'voice', 'synthesis', 'ai'],
    },
    {
      id: 'asr',
      title: t('settings.ai.asr'),
      description: t('settings.ai.asrDescription'),
      category: 'ai',
      keywords: ['asr', 'speech recognition', 'stt', 'transcription', 'ai'],
    },
    {
      id: 'dictionary',
      title: t('settings.ai.dictionary'),
      description: t('settings.ai.dictionaryDescription'),
      category: 'ai',
      keywords: ['dictionary', 'lookup', 'word', 'definition', 'ai'],
    },
    {
      id: 'assessment',
      title: t('settings.ai.assessment'),
      description: t('settings.ai.assessmentDescription'),
      category: 'ai',
      keywords: ['assessment', 'pronunciation', 'evaluation', 'score', 'ai'],
    },
  ], [t])

  // Filter settings based on search query
  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return allSettings

    const query = searchQuery.toLowerCase()
    return allSettings.filter(setting =>
      setting.title.toLowerCase().includes(query) ||
      setting.description.toLowerCase().includes(query) ||
      setting.keywords.some(keyword => keyword.toLowerCase().includes(query))
    )
  }, [searchQuery, allSettings])

  // Group filtered settings by category
  const settingsByCategory = useMemo(() => {
    const grouped: {
      general: SettingItem[]
      appearance: SettingItem[]
      language: SettingItem[]
      ai: SettingItem[]
    } = {
      general: [],
      appearance: [],
      language: [],
      ai: [],
    }

    filteredSettings.forEach(setting => {
      grouped[setting.category].push(setting)
    })

    return grouped
  }, [filteredSettings])

  // Auto-switch tab based on search results
  const visibleTabs = useMemo(() => {
    const tabs = []
    if (settingsByCategory.general.length > 0) tabs.push('general')
    if (settingsByCategory.appearance.length > 0) tabs.push('appearance')
    if (settingsByCategory.language.length > 0) tabs.push('language')
    if (settingsByCategory.ai.length > 0) tabs.push('ai')
    return tabs
  }, [settingsByCategory])

  // Auto-select first visible tab if current tab has no results
  if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
    setActiveTab(visibleTabs[0])
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.description', { defaultValue: 'Manage your application settings' })}
        </p>
      </div>

      <SettingsSearch value={searchQuery} onChange={setSearchQuery} />

      <SettingsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        settingsByCategory={settingsByCategory}
      />
    </div>
  )
}
