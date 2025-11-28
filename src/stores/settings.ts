import { create } from "zustand"
import { persist } from "zustand/middleware"
import i18n from "../lib/i18n"

type Theme = "light" | "dark" | "system"

interface SettingsState {
  theme: Theme
  preferredLanguage: string
  dailyGoal: number
  setTheme: (theme: Theme) => void
  setPreferredLanguage: (lang: string) => void
  setDailyGoal: (goal: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      preferredLanguage: "en",
      dailyGoal: 30,
      setTheme: (theme) => set({ theme }),
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
