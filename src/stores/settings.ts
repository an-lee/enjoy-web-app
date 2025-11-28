import { create } from "zustand"
import { persist } from "zustand/middleware"
import i18n from "../lib/i18n"

interface SettingsState {
  preferredLanguage: string
  dailyGoal: number
  setPreferredLanguage: (lang: string) => void
  setDailyGoal: (goal: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      preferredLanguage: "en",
      dailyGoal: 30,
      setPreferredLanguage: (lang) => {
        set({ preferredLanguage: lang })
        // Sync with i18n
        i18n.changeLanguage(lang)
      },
      setDailyGoal: (goal) => set({ dailyGoal: Math.max(0, goal) }),
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
