import { create } from "zustand"
import { persist } from "zustand/middleware"
import i18n from "../lib/i18n"
import type { AIProvider } from "@/services/ai/types"

interface AIServiceSettings {
  translation: {
    defaultProvider: AIProvider
    defaultStyle: string
  }
  tts: {
    defaultProvider: AIProvider
    preferredVoice?: string
  }
  asr: {
    defaultProvider: AIProvider
  }
  dictionary: {
    defaultProvider: AIProvider
  }
  assessment: {
    defaultProvider: AIProvider
  }
  // BYOK settings (future)
  apiKeys?: {
    openai?: string
    azure?: {
      subscriptionKey: string
      region: string
    }
  }
}

interface SettingsState {
  preferredLanguage: string // UI language (interface language)
  nativeLanguage: string // Native language (mother tongue, used as translation target)
  learningLanguage: string // Language being learned
  dailyGoal: number
  aiServices: AIServiceSettings
  setPreferredLanguage: (lang: string) => void
  setNativeLanguage: (lang: string) => void
  setLearningLanguage: (lang: string) => void
  setDailyGoal: (goal: number) => void
  setAIServiceSettings: (settings: Partial<AIServiceSettings>) => void
  updateAIServiceProvider: (service: keyof AIServiceSettings, provider: AIProvider) => void
}

const defaultAISettings: AIServiceSettings = {
  translation: {
    defaultProvider: 'enjoy',
    defaultStyle: 'natural',
  },
  tts: {
    defaultProvider: 'enjoy',
  },
  asr: {
    defaultProvider: 'local',
  },
  dictionary: {
    defaultProvider: 'enjoy',
  },
  assessment: {
    defaultProvider: 'enjoy',
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      preferredLanguage: "en", // UI language
      nativeLanguage: "zh", // Native language (default to Chinese)
      learningLanguage: "en", // Learning language (default to English)
      dailyGoal: 30,
      aiServices: defaultAISettings,
      setPreferredLanguage: (lang) => {
        set({ preferredLanguage: lang })
        // Sync with i18n
        i18n.changeLanguage(lang)
      },
      setNativeLanguage: (lang) => set({ nativeLanguage: lang }),
      setLearningLanguage: (lang) => set({ learningLanguage: lang }),
      setDailyGoal: (goal) => set({ dailyGoal: Math.max(0, goal) }),
      setAIServiceSettings: (settings) =>
        set((state) => ({
          aiServices: { ...state.aiServices, ...settings },
        })),
      updateAIServiceProvider: (service, provider) =>
        set((state) => ({
          aiServices: {
            ...state.aiServices,
            [service]: {
              ...state.aiServices[service],
              defaultProvider: provider,
            },
          },
        })),
    }),
    {
      name: "enjoy-settings",
      onRehydrateStorage: () => (state) => {
        // Sync i18n language when store is rehydrated
        if (state?.preferredLanguage) {
          i18n.changeLanguage(state.preferredLanguage)
        }
      },
    }
  )
)
