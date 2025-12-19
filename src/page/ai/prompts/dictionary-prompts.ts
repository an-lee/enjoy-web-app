/**
 * Dictionary Prompts
 * Shared prompts for dictionary lookup across all providers (local, cloud, etc.)
 */

import { getLanguageName } from './language-utils'

/**
 * Build dictionary lookup prompt for generative models
 * This prompt is used by both local models and cloud services
 */
export function buildDictionaryPrompt(
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

/**
 * Parse dictionary response from generative model
 * Handles JSON extraction and parsing from model responses
 */
export function parseDictionaryResponse(response: string): {
  word: string
  definitions: Array<{
    partOfSpeech: string
    definition: string
    translation: string
    example?: string
  }>
  contextualExplanation?: string
  etymology?: string
} {
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

