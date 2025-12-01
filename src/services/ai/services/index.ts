/**
 * AI Services Export
 * Public API for all AI services
 */

export * from './asr'
export * from './tts'
export * from './smart-translation'
export * from './smart-dictionary'
export * from './assessment'

// Re-export service instances for convenience
import { asrService } from './asr'
import { ttsService } from './tts'
import { smartTranslationService } from './smart-translation'
import { smartDictionaryService } from './smart-dictionary'
import { assessmentService } from './assessment'

export const aiServices = {
  asr: asrService,
  tts: ttsService,
  smartTranslation: smartTranslationService,
  smartDictionary: smartDictionaryService,
  assessment: assessmentService,
}

