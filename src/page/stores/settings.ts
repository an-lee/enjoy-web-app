import { create } from "zustand"
import { persist } from "zustand/middleware"
import i18n from "@/locales/i18n"
import { AIProvider } from "@/ai/types"

interface AIServiceSettings {
  // Smart translation - style-based translation, used for user-generated content
  smartTranslation: {
    defaultProvider: AIProvider
    defaultStyle: string
    localModel?: string // Model name when using local provider
  }
  // Legacy: Keep for backward compatibility (maps to smartTranslation)
  translation?: {
    defaultProvider: AIProvider
    defaultStyle: string
    localModel?: string
  }
  tts: {
    defaultProvider: AIProvider
    preferredVoice?: string
    localModel?: string
  }
  asr: {
    defaultProvider: AIProvider
    localModel?: string // Model name when using local provider, e.g., 'Xenova/whisper-tiny'
  }
  smartDictionary: {
    // Contextual dictionary (AI-powered) - requires AI configuration
    defaultProvider: AIProvider
    localModel?: string
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
  updateLocalModel: (service: keyof AIServiceSettings, modelName: string) => void
}

const defaultAISettings: AIServiceSettings = {
  smartTranslation: {
    defaultProvider: AIProvider.ENJOY,
    defaultStyle: 'natural',
  },
  tts: {
    defaultProvider: AIProvider.ENJOY,
  },
  asr: {
    defaultProvider: AIProvider.LOCAL,
  },
  smartDictionary: {
    defaultProvider: AIProvider.ENJOY,
  },
  assessment: {
    defaultProvider: AIProvider.ENJOY,
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
        set((state) => {
          let serviceConfig = state.aiServices[service as keyof AIServiceSettings] as any

          // If service config doesn't exist, create it with defaults
          if (!serviceConfig) {
            const defaultConfig = defaultAISettings[service as keyof typeof defaultAISettings]
            if (defaultConfig) {
              serviceConfig = { ...defaultConfig }
            } else {
              return state
            }
          }

          return {
            aiServices: {
              ...state.aiServices,
              [service]: {
                ...serviceConfig,
                defaultProvider: provider,
              },
            },
          }
        }),
      updateLocalModel: (service, modelName) =>
        set((state) => {
          let serviceConfig = state.aiServices[service as keyof AIServiceSettings] as any

          // If service config doesn't exist, create it with defaults
          if (!serviceConfig) {
            const defaultConfig = defaultAISettings[service as keyof typeof defaultAISettings]
            if (defaultConfig) {
              serviceConfig = { ...defaultConfig }
            } else {
              return state
            }
          }

          return {
            aiServices: {
              ...state.aiServices,
              [service]: {
                ...serviceConfig,
                localModel: modelName,
              },
            },
          }
        }),
    }),
    {
      name: "enjoy-settings",
      onRehydrateStorage: () => (state) => {
        // Sync i18n language when store is rehydrated
        if (state?.preferredLanguage) {
          i18n.changeLanguage(state.preferredLanguage)
        }
        // Ensure smartTranslation is initialized if missing
        if (state?.aiServices) {
          if (!state.aiServices.smartTranslation) {
            state.aiServices.smartTranslation = defaultAISettings.smartTranslation
          }
        }
      },
    }
  )
)
