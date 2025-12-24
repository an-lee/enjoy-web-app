/**
 * Contextual Translation Service
 * Handles context-aware translation using generative models
 * Uses surrounding text context to provide better translations
 */

import type { LocalModelConfig } from '../../../types'
import { useLocalModelsStore } from '@/page/stores/local-models'
import { getSmartTranslationWorker } from '../workers/worker-manager'
import { DEFAULT_SMART_TRANSLATION_MODEL } from '../constants'
import type { LocalTranslationResult } from '../types'
import { WorkerTaskManager } from '@/page/lib/workers/worker-task-manager'
import { getLanguageName } from '../../../prompts/language-utils'

/**
 * Contextual translate text using generative model with context
 */
export async function contextualTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  context: string | undefined,
  modelConfig?: LocalModelConfig,
  signal?: AbortSignal
): Promise<LocalTranslationResult> {
  const modelName = modelConfig?.model || DEFAULT_SMART_TRANSLATION_MODEL
  const store = useLocalModelsStore.getState()

  // Check if model is already loaded
  const modelStatus = store.models.smartTranslation
  if (!modelStatus.loaded || modelStatus.modelName !== modelName) {
    // Initialize model loading
    store.setModelLoading('smartTranslation', true)

    const worker = getSmartTranslationWorker()

    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model loading timeout'))
      }, 300000) // 5 minutes timeout

      const messageHandler = (event: MessageEvent) => {
        const { type, data } = event.data

        if (type === 'ready' && data.model === modelName) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          resolve()
        } else if (type === 'error') {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error(data.message))
        }
      }

      worker.addEventListener('message', messageHandler)

      // Send init message
      worker.postMessage({
        type: 'init',
        data: { model: modelName },
      })
    })
  }

  // Translate using worker
  const worker = getSmartTranslationWorker()

  const taskManager = new WorkerTaskManager({
    workerId: 'smart-translation-worker',
    workerType: 'smart-translation',
    metadata: {
      text: text.substring(0, 50), // Store first 50 chars for reference
      sourceLanguage,
      targetLanguage,
      hasContext: !!context,
      model: modelName,
    },
    onCancel: () => {
      const taskId = taskManager.getTaskId()
      if (taskId) {
        worker.postMessage({
          type: 'cancel',
          data: { taskId },
        })
      }
    },
  })

  // Handle abort signal
  if (signal) {
    if (signal.aborted) {
      throw new Error('Request was cancelled')
    }
    signal.addEventListener('abort', () => {
      taskManager.cancel()
    })
  }

  // Build contextual translation prompt
  const srcLangName = getLanguageName(sourceLanguage)
  const tgtLangName = getLanguageName(targetLanguage)

  let systemPrompt = ''
  let userPrompt = ''

  if (context) {
    systemPrompt = `You are a translation assistant. Translate the text from ${srcLangName} to ${tgtLangName} considering the surrounding context. Only output the translation, without any explanation, reasoning, or additional text. Do not repeat the output.`
    userPrompt = `Context: ${context}\n\nText to translate: ${text}`
  } else {
    systemPrompt = `You are a translation assistant. Translate the text from ${srcLangName} to ${tgtLangName}. Only output the translation, without any explanation, reasoning, or additional text. Do not repeat the output.`
    userPrompt = text
  }

  return taskManager.execute(async (taskId) => {
    return new Promise<LocalTranslationResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener('message', messageHandler)
        reject(new Error('Contextual translation timeout'))
      }, 300000) // 5 minutes timeout

      const messageHandler = (event: MessageEvent) => {
        const { type, data, taskId: responseTaskId } = event.data

        if (type === 'result' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)

          resolve({
            translatedText: data.translatedText || '',
            sourceLanguage: data.sourceLanguage || sourceLanguage,
            targetLanguage: data.targetLanguage || targetLanguage,
          })
        } else if (type === 'error' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error(data.message || 'Contextual translation failed'))
        } else if (type === 'cancelled' && responseTaskId === taskId) {
          clearTimeout(timeout)
          worker.removeEventListener('message', messageHandler)
          reject(new Error('Request was cancelled'))
        }
      }

      worker.addEventListener('message', messageHandler)

      // Send translation request with context
      worker.postMessage({
        type: 'translate',
        data: {
          text,
          srcLang: sourceLanguage,
          tgtLang: targetLanguage,
          style: 'natural', // Use natural style for contextual translation
          customPrompt: undefined,
          systemPrompt,
          userPrompt,
          model: modelName,
          taskId,
        },
      })
    })
  })
}

