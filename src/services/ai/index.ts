/**
 * AI Services Unified Export
 */

export * from './types'
export * from './translation'
export * from './tts'
export * from './assessment'
export * from './dictionary'
export * from './asr'
export * from './azure-speech'
export * from './local-models'
export * from './provider-selector'
export * from './key-management'

// Unified service manager
import { translationService } from './translation'
import { ttsService } from './tts'
import { assessmentService } from './assessment'
import { dictionaryService } from './dictionary'
import { asrService } from './asr'

export const aiServices = {
  translation: translationService,
  tts: ttsService,
  assessment: assessmentService,
  dictionary: dictionaryService,
  asr: asrService,
}

