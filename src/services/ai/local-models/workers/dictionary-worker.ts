/**
 * Dictionary Web Worker
 * Handles dictionary lookup model loading and inference in a separate thread
 */

import { pipeline, env } from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.allowRemoteModels = true

// Model configuration
const DEFAULT_DICTIONARY_MODEL = 'onnx-community/Qwen3-0.6B-DQ-ONNX'

interface DictionaryWorkerMessage {
  type: 'init' | 'lookup' | 'checkStatus'
  data?: {
    model?: string
    word?: string
    context?: string
    srcLang?: string
    tgtLang?: string
    taskId?: string
  }
}

interface DictionaryWorkerResponse {
  type: 'progress' | 'ready' | 'result' | 'error' | 'status'
  data?: any
  taskId?: string
}

// Singleton pattern for Text Generation pipeline (for dictionary lookup via prompts)
class DictionaryPipelineSingleton {
  static instance: any = null
  static modelName: string | null = null
  static loading: boolean = false

  static async getInstance(
    modelName: string = DEFAULT_DICTIONARY_MODEL,
    progressCallback?: (progress: any) => void
  ) {
    // If already loaded with the same model, return existing instance
    if (this.instance && this.modelName === modelName) {
      return this.instance
    }

    // If loading, wait for it
    if (this.loading) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.loading && this.instance) {
            clearInterval(checkInterval)
            resolve(this.instance)
          }
        }, 100)
      })
    }

    // Start loading
    this.loading = true
    this.modelName = modelName

    try {
      // Use text-generation pipeline for generative models
      this.instance = await pipeline('text-generation', modelName, {
        progress_callback: (progress: any) => {
          if (progressCallback) {
            progressCallback(progress)
          }
          // Send progress to main thread
          self.postMessage({
            type: 'progress',
            data: progress,
          } as DictionaryWorkerResponse)
        },
      })

      this.loading = false

      // Notify main thread that model is ready
      self.postMessage({
        type: 'ready',
        data: { model: modelName },
      } as DictionaryWorkerResponse)

      return this.instance
    } catch (error: any) {
      this.loading = false
      this.instance = null
      this.modelName = null
      throw error
    }
  }

  static isLoaded(): boolean {
    return this.instance !== null
  }

  static getModelName(): string | null {
    return this.modelName
  }
}

// Language name mapping for dictionary prompts
const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  // Add more mappings as needed
}

function getLanguageName(code: string): string {
  return LANGUAGE_NAME_MAP[code] || code
}

// Build dictionary lookup prompt for generative models
function buildDictionaryPrompt(
  word: string,
  context: string | undefined,
  sourceLanguage: string,
  targetLanguage: string
): string {
  const srcLangName = getLanguageName(sourceLanguage)
  const tgtLangName = getLanguageName(targetLanguage)

  let prompt = `Provide a dictionary entry for the word "${word}" in ${srcLangName}, with translation and explanation in ${tgtLangName}.`

  if (context) {
    prompt += ` The word appears in this context: "${context}". Please provide a contextual explanation.`
  }

  prompt += `\n\nFormat your response as JSON with the following structure:
{
  "word": "${word}",
  "definitions": [
    {
      "partOfSpeech": "noun/verb/adjective/etc",
      "definition": "definition in ${srcLangName}",
      "translation": "translation in ${tgtLangName}",
      "example": "example sentence (optional)"
    }
  ],
  "contextualExplanation": "explanation of how the word is used in the given context (if context provided)",
  "etymology": "word origin (optional)"
}

Only output the JSON, without any additional text or explanation.`

  return prompt
}

// Parse dictionary response from generative model
function parseDictionaryResponse(response: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    // If no JSON found, try parsing the whole response
    return JSON.parse(response)
  } catch (error) {
    // If parsing fails, return a basic structure
    return {
      word: '',
      definitions: [],
      contextualExplanation: response,
    }
  }
}

// Listen for messages from main thread
self.addEventListener('message', async (event: MessageEvent<DictionaryWorkerMessage>) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'init': {
        // Initialize model
        const modelName = data?.model || DEFAULT_DICTIONARY_MODEL
        await DictionaryPipelineSingleton.getInstance(modelName, (progress) => {
          self.postMessage({
            type: 'progress',
            data: progress,
          } as DictionaryWorkerResponse)
        })
        break
      }

      case 'checkStatus': {
        // Check if model is loaded
        self.postMessage({
          type: 'status',
          data: {
            loaded: DictionaryPipelineSingleton.isLoaded(),
            model: DictionaryPipelineSingleton.getModelName(),
          },
        } as DictionaryWorkerResponse)
        break
      }

      case 'lookup': {
        // Dictionary lookup using generative model with prompts
        if (!data?.word || !data?.srcLang || !data?.tgtLang) {
          throw new Error('Word, source language, and target language are required')
        }

        const modelName = data?.model || DEFAULT_DICTIONARY_MODEL
        const generator = await DictionaryPipelineSingleton.getInstance(modelName)

        // Build dictionary prompt
        const prompt = buildDictionaryPrompt(
          data.word,
          data.context,
          data.srcLang,
          data.tgtLang
        )

        // Generate dictionary entry
        const result = await generator(prompt, {
          max_new_tokens: 1024,
          temperature: 0.5,
          top_p: 0.9,
          return_full_text: false,
        })

        // Extract generated text
        let generatedText = ''
        if (Array.isArray(result) && result.length > 0) {
          generatedText = result[0].generated_text || result[0].text || ''
        } else if (result.generated_text) {
          generatedText = result.generated_text
        } else if (result.text) {
          generatedText = result.text
        }

        // Parse dictionary response
        const dictionaryData = parseDictionaryResponse(generatedText.trim())

        // Send result back to main thread
        self.postMessage({
          type: 'result',
          data: {
            word: dictionaryData.word || data.word,
            definitions: dictionaryData.definitions || [],
            contextualExplanation: dictionaryData.contextualExplanation,
            etymology: dictionaryData.etymology,
          },
          taskId: data?.taskId,
        } as DictionaryWorkerResponse)
        break
      }

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      data: {
        message: error.message || 'Unknown error',
        stack: error.stack,
      },
      taskId: data?.taskId,
    } as DictionaryWorkerResponse)
  }
})

