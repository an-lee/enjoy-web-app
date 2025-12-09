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
 * Translation prompt structure with system and user prompts
 */
export interface TranslationPrompt {
  systemPrompt: string
  userPrompt: string
}

/**
 * Build smart translation prompt with style support
 * Returns system prompt and user prompt separately for better model control
 * This prompt is used by both local models and cloud services
 * Optimized for smaller models (e.g., Qwen3-0.6B) with explicit format constraints
 */
export function buildSmartTranslationPrompt(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: TranslationStyle = 'natural',
  customPrompt?: string
): TranslationPrompt {
  const srcLangName = getLanguageName(sourceLanguage)
  const tgtLangName = getLanguageName(targetLanguage)

  let systemPrompt = ''
  let userPrompt = ''

  if (style === 'custom' && customPrompt) {
    // Use custom prompt if provided
    // System prompt contains the translation instruction
    systemPrompt = customPrompt
    // User prompt contains the text to translate
    userPrompt = text
  } else {
    // Use style-based prompt optimized for smaller models
    const styleDesc = TRANSLATION_STYLE_DESCRIPTIONS[style] || TRANSLATION_STYLE_DESCRIPTIONS.natural
    const styleInstruction = styleDesc.replace('${tgtLangName}', tgtLangName)

    // System prompt: Clear instruction about translation task and constraints
    systemPrompt = `You are a translation assistant. Translate text from ${srcLangName} to ${tgtLangName}. ${styleInstruction} Only output the translation, without any explanation, reasoning, or additional text. Do not repeat the output.`

    // User prompt: Just the text to translate
    userPrompt = text
  }

  return {
    systemPrompt,
    userPrompt,
  }
}

/**
 * Build combined prompt (for backward compatibility or models that don't support system prompts)
 * @deprecated Use buildSmartTranslationPrompt instead for better control
 */
export function buildSmartTranslationPromptLegacy(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  style: TranslationStyle = 'natural',
  customPrompt?: string
): string {
  const { systemPrompt, userPrompt } = buildSmartTranslationPrompt(
    text,
    sourceLanguage,
    targetLanguage,
    style,
    customPrompt
  )
  return `${systemPrompt}\n\n${userPrompt}`
}

/**
 * Get translation style description
 */
export function getTranslationStyleDescription(style: TranslationStyle): string {
  return TRANSLATION_STYLE_DESCRIPTIONS[style] || TRANSLATION_STYLE_DESCRIPTIONS.natural
}

