/**
 * Translation Prompts
 * Shared prompts for smart translation across all providers (local, cloud, etc.)
 */

import type { TranslationStyle } from '@/db/schema'
import { getLanguageName } from './language-utils'

/**
 * Translation style descriptions
 * Used to build prompts for different translation styles
 */
export const TRANSLATION_STYLE_DESCRIPTIONS: Record<TranslationStyle, string> = {
  literal: 'Translate word-for-word, preserving the original structure as much as possible.',
  natural: 'Translate naturally and fluently, making it sound like native ${tgtLangName}.',
  casual: 'Translate in a casual, conversational style, using everyday language.',
  formal: 'Translate in a formal, professional style, suitable for business or academic contexts.',
  simplified: 'Translate in a simplified way, using easier vocabulary and shorter sentences, suitable for language learners.',
  detailed: 'Translate with detailed explanations, including cultural context and nuances.',
  custom: '', // Custom prompt will be provided by user
}

/**
 * Build smart translation prompt with style support
 * This prompt is used by both local models and cloud services
 */
export function buildSmartTranslationPrompt(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: TranslationStyle = 'natural',
  customPrompt?: string
): string {
  const srcLangName = getLanguageName(sourceLanguage)
  const tgtLangName = getLanguageName(targetLanguage)

  let prompt = ''

  if (style === 'custom' && customPrompt) {
    // Use custom prompt if provided
    prompt = `${customPrompt}\n\nSource text (${srcLangName}): ${text}\n\nTranslation (${tgtLangName}):`
  } else {
    // Use style-based prompt
    const styleDesc = TRANSLATION_STYLE_DESCRIPTIONS[style] || TRANSLATION_STYLE_DESCRIPTIONS.natural
    const styleInstruction = styleDesc.replace('${tgtLangName}', tgtLangName)

    prompt = `Translate the following text from ${srcLangName} to ${tgtLangName}. ${styleInstruction} Only output the translation, without any explanation or additional text.

Source text (${srcLangName}): ${text}

Translation (${tgtLangName}):`
  }

  return prompt
}

/**
 * Get translation style description
 */
export function getTranslationStyleDescription(style: TranslationStyle): string {
  return TRANSLATION_STYLE_DESCRIPTIONS[style] || TRANSLATION_STYLE_DESCRIPTIONS.natural
}

