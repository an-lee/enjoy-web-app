/**
 * Local Models Store
 * Manages the state of local AI models (loading status, current models, etc.)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModelType = 'asr' | 'translation' | 'dictionary' | 'tts'

export interface ModelStatus {
  loaded: boolean
  loading: boolean
  modelName: string | null
  error: string | null
  progress?: {
    file?: string
    progress?: number
    status?: string
  }
}

interface LocalModelsState {
  // Model statuses by type
  models: Record<ModelType, ModelStatus>

  // Actions
  setModelStatus: (type: ModelType, status: Partial<ModelStatus>) => void
  setModelLoading: (type: ModelType, loading: boolean) => void
  setModelLoaded: (type: ModelType, modelName: string) => void
  setModelError: (type: ModelType, error: string | null) => void
  setModelProgress: (type: ModelType, progress: ModelStatus['progress']) => void
  resetModel: (type: ModelType) => void
}

const defaultModelStatus: ModelStatus = {
  loaded: false,
  loading: false,
  modelName: null,
  error: null,
}

export const useLocalModelsStore = create<LocalModelsState>()(
  persist(
    (set) => ({
      models: {
        asr: { ...defaultModelStatus },
        translation: { ...defaultModelStatus },
        dictionary: { ...defaultModelStatus },
        tts: { ...defaultModelStatus },
      },

      setModelStatus: (type, status) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: { ...state.models[type], ...status },
          },
        })),

      setModelLoading: (type, loading) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: { ...state.models[type], loading, error: null },
          },
        })),

      setModelLoaded: (type, modelName) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: {
              ...state.models[type],
              loaded: true,
              loading: false,
              modelName,
              error: null,
              progress: undefined, // Clear progress when model is loaded
            },
          },
        })),

      setModelError: (type, error) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: {
              ...state.models[type],
              loading: false,
              error,
            },
          },
        })),

      setModelProgress: (type, progress) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: { ...state.models[type], progress },
          },
        })),

      resetModel: (type) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: { ...defaultModelStatus },
          },
        })),
    }),
    {
      name: 'enjoy-local-models',
      // Only persist loaded status and model name, not loading state
      partialize: (state) => ({
        models: {
          asr: {
            loaded: state.models.asr.loaded,
            loading: false,
            modelName: state.models.asr.modelName,
            error: null,
            progress: undefined,
          },
          translation: {
            loaded: state.models.translation.loaded,
            loading: false,
            modelName: state.models.translation.modelName,
            error: null,
            progress: undefined,
          },
          dictionary: {
            loaded: state.models.dictionary.loaded,
            loading: false,
            modelName: state.models.dictionary.modelName,
            error: null,
            progress: undefined,
          },
          tts: {
            loaded: state.models.tts.loaded,
            loading: false,
            modelName: state.models.tts.modelName,
            error: null,
            progress: undefined,
          },
        },
      }),
    }
  )
)

