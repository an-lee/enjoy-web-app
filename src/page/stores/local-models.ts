/**
 * Local Models Store
 * Manages the state of local AI models (loading status, current models, etc.)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeProgress } from '@/ai/providers/local/utils/progress'

export type ModelType = 'asr' | 'smartTranslation' | 'smartDictionary' | 'tts'

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
  errorDetails?: {
    stack?: string
    name?: string
    cause?: any
    originalError?: string
  }
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
  setModelError: (type: ModelType, error: string | null, errorDetails?: ModelStatus['errorDetails']) => void
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
        smartDictionary: { ...defaultModelStatus },
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
            [type]: {
              ...defaultModelStatus,
              ...state.models[type],
              loading,
              error: null,
              // Clear file progress when starting new load
              ...(loading ? { files: undefined, progress: undefined } : {}),
            },
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
              files: undefined, // Clear file progress when model is loaded
              progress: undefined, // Clear progress when model is loaded
            },
          },
        })),

      setModelError: (type, error, errorDetails) =>
        set((state) => ({
          models: {
            ...state.models,
            [type]: {
              ...defaultModelStatus,
              ...state.models[type],
              loading: false,
              error,
              errorDetails: error ? errorDetails : undefined,
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

          // If we have a file name, track it separately
          if (fileName) {
            // Multi-file progress tracking
            const currentFiles = currentModel.files || {}
            const fileKey = typeof fileName === 'string' ? fileName : String(fileName)
            const existingFile = currentFiles[fileKey]

            // Don't overwrite completed files (progress >= 1.0) with lower progress
            // This prevents completed files from being reset when a new file starts
            if (existingFile && existingFile.progress >= 1.0 && normalizedProgress < 1.0) {
              // Keep the completed file's progress, but update other fields if provided
              const fileProgress: FileProgress = {
                ...existingFile,
                size: (progress as any)?.size || (progress as any)?.total || existingFile.size,
                loaded: (progress as any)?.loaded || (progress as any)?.loadedBytes || existingFile.loaded,
                status: progress.status || (progress as any)?.message || (progress as any)?.text || existingFile.status,
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
            }

            // Update or create file progress
            const fileProgress: FileProgress = {
              name: fileKey,
              progress: normalizedProgress,
              size: (progress as any)?.size || (progress as any)?.total || existingFile?.size,
              loaded: (progress as any)?.loaded || (progress as any)?.loadedBytes || existingFile?.loaded,
              status: progress.status || (progress as any)?.message || (progress as any)?.text || existingFile?.status,
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
            loaded: state.models.asr?.loaded ?? false,
            loading: false,
            modelName: state.models.asr?.modelName ?? null,
            error: null,
            progress: undefined,
          },
          smartTranslation: {
            loaded: state.models.smartTranslation?.loaded ?? false,
            loading: false,
            modelName: state.models.smartTranslation?.modelName ?? null,
            error: null,
            progress: undefined,
          },
          smartDictionary: {
            loaded: state.models.smartDictionary?.loaded ?? false,
            loading: false,
            modelName: state.models.smartDictionary?.modelName ?? null,
            error: null,
            progress: undefined,
          },
          tts: {
            loaded: state.models.tts?.loaded ?? false,
            loading: false,
            modelName: state.models.tts?.modelName ?? null,
            error: null,
            progress: undefined,
          },
        },
      }),
    }
  )
)

