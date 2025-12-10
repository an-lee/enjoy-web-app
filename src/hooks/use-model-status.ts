import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocalModelsStore } from '@/stores'
import { localModelService } from '@/ai/providers/local'
import { createLogger } from '@/lib/utils'
import type { ModelType } from '@/stores/local-models'

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'useModelStatus' })

interface UseModelStatusOptions {
  isLocal: boolean
  modelType: ModelType | null | undefined
  currentModel: string
}

export function useModelStatus({ isLocal, modelType, currentModel }: UseModelStatusOptions) {
  const { t } = useTranslation()
  const { models, setModelLoading, setModelError } = useLocalModelsStore()
  const [initializing, setInitializing] = useState(false)
  const [loadingFromCache, setLoadingFromCache] = useState(false)
  const [isCached, setIsCached] = useState<boolean | null>(null)

  const modelStatus = modelType ? models[modelType] : null

  // Check model cache status when switching models
  useEffect(() => {
    if (isLocal && modelType && currentModel && !modelStatus?.loaded && !modelStatus?.loading) {
      // First check if model is already loaded in worker
      localModelService
        .checkModelLoaded(modelType, { model: currentModel })
        .then((workerStatus) => {
          if (workerStatus.loaded && workerStatus.modelName === currentModel) {
            // Model is already loaded in worker, update state
            useLocalModelsStore.getState().setModelLoaded(modelType, currentModel)
            setIsCached(null) // Don't show cache status if already loaded
          } else {
            // Check if model is cached
            return localModelService.checkModelCache(modelType, { model: currentModel })
          }
        })
        .then((cached) => {
          if (typeof cached === 'boolean') {
            setIsCached(cached)
          }
        })
        .catch(() => {
          setIsCached(false)
        })
    } else {
      setIsCached(null)
    }
  }, [isLocal, modelType, currentModel, modelStatus?.loaded, modelStatus?.loading])

  // Clear progress when model is loaded
  useEffect(() => {
    if (modelStatus?.loaded && modelStatus?.progress && modelType) {
      // Clear progress after a short delay to allow UI to update
      const timer = setTimeout(() => {
        useLocalModelsStore.getState().setModelProgress(modelType, undefined)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [modelStatus?.loaded, modelType])

  const handleInitializeModel = async () => {
    if (!modelType || !currentModel) return

    // First check if model is already loaded in worker
    try {
      const workerStatus = await localModelService.checkModelLoaded(modelType, { model: currentModel })
      if (workerStatus.loaded && workerStatus.modelName === currentModel) {
        // Model is already loaded, just update state
        useLocalModelsStore.getState().setModelLoaded(modelType, currentModel)
        setInitializing(false)
        return
      }
    } catch (error) {
      log.warn('Failed to check worker status:', error)
    }

    setInitializing(true)
    setModelLoading(modelType, true)

    try {
      // Check if model is cached before loading
      const cached = await localModelService.checkModelCache(modelType, { model: currentModel })
      if (cached) {
        // Model is cached, loading should be fast
        setLoadingFromCache(true)
        log.info(`Model ${currentModel} is cached, loading from cache...`)
      } else {
        setLoadingFromCache(false)
      }

      if (modelType === 'asr' || modelType === 'smartTranslation' || modelType === 'smartDictionary' || modelType === 'tts') {
        await localModelService.initializeModel(modelType, { model: currentModel })
      } else {
        throw new Error(
          t('settings.ai.modelNotSupported', { defaultValue: 'Model type not supported for local execution' })
        )
      }
    } catch (error: any) {
      // Log detailed error for debugging
      log.error('Model initialization error')
      log.error('Model type:', modelType)
      log.error('Current model:', currentModel)
      log.error('Error object:', error)
      log.error('Error message:', error?.message)
      log.error('Error stack:', error?.stack)
      log.error('Error name:', error?.name)
      log.error('Error cause:', error?.cause)
      log.error('Error string:', String(error))
      try {
        log.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      } catch (e) {
        log.error('Cannot stringify error:', e)
      }

      const errorMessage =
        error?.message ||
        error?.toString() ||
        t('settings.ai.failedToInitialize', { defaultValue: 'Failed to initialize model' })
      setModelError(modelType, errorMessage)
    } finally {
      setInitializing(false)
      setLoadingFromCache(false)
    }
  }

  const handleModelChange = async (modelValue: string) => {
    if (!modelType) return

    // Check if the new model is already loaded in worker
    try {
      const workerStatus = await localModelService.checkModelLoaded(modelType, { model: modelValue })
      if (workerStatus.loaded && workerStatus.modelName === modelValue) {
        // Model is already loaded in worker, update state directly
        useLocalModelsStore.getState().setModelLoaded(modelType, modelValue)
        return
      }
    } catch (error) {
      log.warn('Failed to check worker status:', error)
    }

    // If model is already loaded but different model is selected, reset status
    if (modelStatus?.loaded && modelStatus.modelName !== modelValue) {
      useLocalModelsStore.getState().resetModel(modelType)
    }
  }

  return {
    modelStatus,
    initializing,
    loadingFromCache,
    isCached,
    handleInitializeModel,
    handleModelChange,
  }
}

