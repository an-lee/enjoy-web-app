/**
 * Local Models Store
 * Manages the state of local AI models (loading status, current models, etc.)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModelType = 'asr' | 'smartTranslation' | 'dictionary' | 'tts'

export interface FileProgress {
  name: string // File name
  progress: number // 0-1
  size?: number // File size in bytes (if available)
  loaded?: number // Loaded bytes (if available)
  status?: string // Status message
}

export interface ModelStatus {
  loaded: boolean
  loading: boolean
  modelName: string | null
  error: string | null
  files?: Record<string, FileProgress> // Track progress for each file
  // Legacy single file progress (for backward compatibility during transition)
  progress?: {
    file?: string
    filename?: string
    name?: string
    progress?: number
    status?: string
    message?: string
    text?: string
    [key: string]: any
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
        smartTranslation: { ...defaultModelStatus },
        dictionary: { ...defaultModelStatus },
        tts: { ...defaultModelStatus },
      },

      setModelStatus: (type, status) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: { ...defaultModelStatus, ...state.models[type], ...status },
          },
        })),

      setModelLoading: (type, loading) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: { ...defaultModelStatus, ...state.models[type], loading, error: null },
          },
        })),

      setModelLoaded: (type, modelName) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: {
              ...defaultModelStatus,
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
              ...defaultModelStatus,
              ...state.models[type],
              loading: false,
              error,
            },
          },
        })),

      setModelProgress: (type, progress) =>
        set((state) => {
          const currentModel = state.models[type] || defaultModelStatus
          
          if (!progress) {
            return {
              models: {
                ...state.models,
                [type]: { ...defaultModelStatus, ...currentModel, files: undefined, progress: undefined },
              },
            }
          }

          // Extract file information from progress data
          const fileName = (progress as any)?.file || (progress as any)?.filename || (progress as any)?.name
          const normalizedProgress = normalizeProgress(progress)
          
          if (fileName) {
            // Multi-file progress tracking
            const currentFiles = currentModel.files || {}
            const fileKey = typeof fileName === 'string' ? fileName : String(fileName)
            
            const fileProgress: FileProgress = {
              name: fileKey,
              progress: normalizedProgress,
              size: (progress as any)?.size || (progress as any)?.total,
              loaded: (progress as any)?.loaded || (progress as any)?.loadedBytes,
              status: progress.status || (progress as any)?.message || (progress as any)?.text,
            }

            return {
              models: {
                ...state.models,
                [type]: {
                  ...defaultModelStatus,
                  ...currentModel,
                  files: {
                    ...currentFiles,
                    [fileKey]: fileProgress,
                  },
                  // Keep legacy progress for current file
                  progress: {
                    ...progress,
                    progress: normalizedProgress,
                  },
                },
              },
            }
          } else {
            // Legacy single file progress (no file name)
            const currentProgress = currentModel.progress
            const mergedProgress = {
              ...currentProgress,
              ...progress,
              progress: normalizedProgress,
            }
            return {
              models: {
                ...state.models,
                [type]: { ...defaultModelStatus, ...currentModel, progress: mergedProgress },
              },
            }
          }
        }),

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
      version: 1,
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
          smartTranslation: {
            loaded: state.models.smartTranslation.loaded,
            loading: false,
            modelName: state.models.smartTranslation.modelName,
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

