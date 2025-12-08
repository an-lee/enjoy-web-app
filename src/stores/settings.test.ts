/**
 * Tests for Settings Store (Zustand)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AIProvider } from '@/services/ai/types'

// Mock i18n before importing the store
vi.mock('@/lib/i18n', () => ({
  default: {
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    language: 'en',
    t: (key: string) => key,
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
  },
}))

// Import after mocking
import { useSettingsStore } from './settings'

describe('Settings Store', () => {
  // Store the original state
  const getInitialState = () => ({
    preferredLanguage: 'en',
    nativeLanguage: 'zh',
    learningLanguage: 'en',
    dailyGoal: 30,
    aiServices: {
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
    },
  })

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    // Get actions from store and reset only the data properties
    const store = useSettingsStore.getState()
    useSettingsStore.setState({
      ...getInitialState(),
      // Preserve the actions
      setPreferredLanguage: store.setPreferredLanguage,
      setNativeLanguage: store.setNativeLanguage,
      setLearningLanguage: store.setLearningLanguage,
      setDailyGoal: store.setDailyGoal,
      setAIServiceSettings: store.setAIServiceSettings,
      updateAIServiceProvider: store.updateAIServiceProvider,
      updateLocalModel: store.updateLocalModel,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = useSettingsStore.getState()
      expect(state.preferredLanguage).toBe('en')
      expect(state.nativeLanguage).toBe('zh')
      expect(state.learningLanguage).toBe('en')
      expect(state.dailyGoal).toBe(30)
    })

    it('should have correct default AI service settings', () => {
      const state = useSettingsStore.getState()
      expect(state.aiServices.smartTranslation.defaultProvider).toBe(AIProvider.ENJOY)
      expect(state.aiServices.smartTranslation.defaultStyle).toBe('natural')
      expect(state.aiServices.tts.defaultProvider).toBe(AIProvider.ENJOY)
      expect(state.aiServices.asr.defaultProvider).toBe(AIProvider.LOCAL)
      expect(state.aiServices.smartDictionary.defaultProvider).toBe(AIProvider.ENJOY)
      expect(state.aiServices.assessment.defaultProvider).toBe(AIProvider.ENJOY)
    })
  })

  describe('setPreferredLanguage', () => {
    it('should update preferred language', () => {
      useSettingsStore.getState().setPreferredLanguage('zh')
      expect(useSettingsStore.getState().preferredLanguage).toBe('zh')
    })

    it('should sync with i18n when language changes', async () => {
      const i18n = await import('@/lib/i18n')
      useSettingsStore.getState().setPreferredLanguage('ja')
      expect(i18n.default.changeLanguage).toHaveBeenCalledWith('ja')
    })
  })

  describe('setNativeLanguage', () => {
    it('should update native language', () => {
      useSettingsStore.getState().setNativeLanguage('en')
      expect(useSettingsStore.getState().nativeLanguage).toBe('en')
    })
  })

  describe('setLearningLanguage', () => {
    it('should update learning language', () => {
      useSettingsStore.getState().setLearningLanguage('ja')
      expect(useSettingsStore.getState().learningLanguage).toBe('ja')
    })
  })

  describe('setDailyGoal', () => {
    it('should update daily goal with valid value', () => {
      useSettingsStore.getState().setDailyGoal(60)
      expect(useSettingsStore.getState().dailyGoal).toBe(60)
    })

    it('should not allow negative daily goal', () => {
      useSettingsStore.getState().setDailyGoal(-10)
      expect(useSettingsStore.getState().dailyGoal).toBe(0)
    })

    it('should allow zero daily goal', () => {
      useSettingsStore.getState().setDailyGoal(0)
      expect(useSettingsStore.getState().dailyGoal).toBe(0)
    })
  })

  describe('setAIServiceSettings', () => {
    it('should update AI service settings partially', () => {
      useSettingsStore.getState().setAIServiceSettings({
        tts: {
          defaultProvider: AIProvider.LOCAL,
          preferredVoice: 'custom-voice',
        },
      })
      const state = useSettingsStore.getState()
      expect(state.aiServices.tts.defaultProvider).toBe(AIProvider.LOCAL)
      expect(state.aiServices.tts.preferredVoice).toBe('custom-voice')
      // Other services should remain unchanged
      expect(state.aiServices.asr.defaultProvider).toBe(AIProvider.LOCAL)
    })
  })

  describe('updateAIServiceProvider', () => {
    it('should update provider for specific service', () => {
      useSettingsStore.getState().updateAIServiceProvider('smartTranslation', AIProvider.LOCAL)
      expect(useSettingsStore.getState().aiServices.smartTranslation.defaultProvider).toBe(AIProvider.LOCAL)
    })

    it('should update provider for TTS service', () => {
      useSettingsStore.getState().updateAIServiceProvider('tts', AIProvider.BYOK)
      expect(useSettingsStore.getState().aiServices.tts.defaultProvider).toBe(AIProvider.BYOK)
    })

    it('should preserve other service properties when updating provider', () => {
      // First set some additional properties
      useSettingsStore.getState().setAIServiceSettings({
        tts: {
          defaultProvider: AIProvider.ENJOY,
          preferredVoice: 'test-voice',
        },
      })
      // Then update just the provider
      useSettingsStore.getState().updateAIServiceProvider('tts', AIProvider.LOCAL)
      const state = useSettingsStore.getState()
      expect(state.aiServices.tts.defaultProvider).toBe(AIProvider.LOCAL)
      expect(state.aiServices.tts.preferredVoice).toBe('test-voice')
    })
  })

  describe('updateLocalModel', () => {
    it('should update local model for specific service', () => {
      useSettingsStore.getState().updateLocalModel('asr', 'Xenova/whisper-tiny')
      expect(useSettingsStore.getState().aiServices.asr.localModel).toBe('Xenova/whisper-tiny')
    })

    it('should preserve other service properties when updating local model', () => {
      useSettingsStore.getState().updateAIServiceProvider('asr', AIProvider.LOCAL)
      useSettingsStore.getState().updateLocalModel('asr', 'Xenova/whisper-base')
      const state = useSettingsStore.getState()
      expect(state.aiServices.asr.defaultProvider).toBe(AIProvider.LOCAL)
      expect(state.aiServices.asr.localModel).toBe('Xenova/whisper-base')
    })
  })

  describe('Persistence', () => {
    it('should use correct storage key', () => {
      useSettingsStore.getState().setPreferredLanguage('fr')
      const stored = localStorage.getItem('enjoy-settings')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.state.preferredLanguage).toBe('fr')
    })
  })
})
