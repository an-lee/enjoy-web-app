/**
 * AI Dictionary Service (LLM-based)
 *
 * Encapsulates prompt construction and LLM call for dictionary-style lookups.
 */

import { DEFAULT_WORKERS_AI_DICTIONARY_MODEL } from '@/shared/constants'
import { ServiceError } from '@/worker/utils/errors'
import { createLogger } from '@/shared/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface DictionaryAIExample {
	source: string
	target?: string
}

export interface DictionaryAISense {
	definition: string
	translation?: string
	partOfSpeech?: string
	examples?: DictionaryAIExample[]
	notes?: string
}

export interface DictionaryAIResult {
	word: string
	sourceLanguage: string
	targetLanguage: string
	/**
	 * Canonical lemma / base form of the word if available (e.g. "run" for "running").
	 */
	lemma?: string
	/**
	 * IPA pronunciation string for the headword, in the source language.
	 * Example: "/rʌn/".
	 */
	ipa?: string
	senses: DictionaryAISense[]
}

export interface DictionaryAIParams {
	word: string
	sourceLang: string
	targetLang: string
	model?: string
}

export interface DictionaryAIUsage {
	prompt_tokens?: number
	completion_tokens?: number
	total_tokens?: number
}

// ============================================================================
// Logger
// ============================================================================

const log = createLogger({ name: 'dictionary-ai-service' })

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build the system prompt for the AI dictionary.
 */
function buildSystemPrompt(): string {
	return [
		'You are a professional bilingual learner dictionary.',
		'Return ONE dictionary entry as compact JSON only (no markdown, no extra text).',
		'',
		'The caller provides language codes (e.g. "en", "zh"). Follow them strictly:',
		'- "definition" and examples[].source MUST be written in the SOURCE language.',
		'- "translation" and examples[].target MUST be written in the TARGET language.',
		'',
		'Schema (JSON only):',
		'{',
		'  "word": string,',
		'  "sourceLanguage": string,      // language code, e.g. "en"',
		'  "targetLanguage": string,      // language code, e.g. "zh"',
		'  "lemma": string,               // canonical base form; if unsure, reuse "word"',
		'  "ipa": string,                 // IPA for headword in the source language (prefer /slashes/); omit only if truly unknown',
		'  "senses": [',
		'    {',
		'      "definition": string,      // meaning explained in source language',
		'      "translation": string,     // target-language equivalent word/phrase (not a rephrased definition)',
		'      "partOfSpeech": string,',
		'      "examples": [ { "source": string, "target": string } ],',
		'      "notes": string            // optional',
		'    }',
		'  ]',
		'}',
		'',
		'Example (en → zh):',
		'{',
		'  "word": "run",',
		'  "sourceLanguage": "en",',
		'  "targetLanguage": "zh",',
		'  "lemma": "run",',
		'  "ipa": "/rʌn/",',
		'  "senses": [',
		'    {',
		'      "definition": "to move quickly on foot",',
		'      "translation": "跑",',
		'      "partOfSpeech": "verb",',
		'      "examples": [ { "source": "I run every morning.", "target": "我每天早上跑步。" } ]',
		'    }',
		'  ]',
		'}',
		'',
		'Coverage and quality:',
		'- Include as many DISTINCT, commonly used senses as a good learner dictionary would list (core senses + common idioms/phrasal uses when applicable).',
		'- Do not omit major senses. Merge near-duplicates. Order senses by frequency/usefulness.',
		'- Keep each definition short and clear. Keep translation concise (a word or short phrase).',
		'- Each sense must have at least 1 natural bilingual example.',
		'- Add "notes" only when it adds real value (register, collocation, usage constraints).',
		'- Omit optional fields rather than using null/undefined.',
		'- If the word is invalid/unknown, return an empty "senses" array and do not invent content.',
		'',
		'Preflight check before you answer:',
		'1) definition/examples.source in SOURCE language? 2) translation/examples.target in TARGET language?',
		'3) lemma included (always) and ipa included (unless truly unknown)? 4) major distinct senses covered?',
	].join('\n')
}

/**
 * Build the user prompt for the AI dictionary.
 */
function buildUserPrompt(params: DictionaryAIParams): string {
	const { word, sourceLang, targetLang } = params

	return [
		`Word: "${word}"`,
		`Source language code: ${sourceLang}`,
		`Target language code: ${targetLang}`,
	].join('\n')
}

/**
 * Parse and validate the AI JSON response into DictionaryAIResult.
 * Accepts either a raw JSON string or an already-parsed object.
 */
export function parseDictionaryResult(raw: unknown): DictionaryAIResult {
	let obj: any = raw

	if (typeof raw === 'string') {
		try {
			obj = JSON.parse(raw)
		} catch (error) {
			log.error('Failed to parse AI dictionary JSON', {
				error: String(error),
				rawSnippet: raw.slice(0, 200),
			})
			throw new ServiceError('AI dictionary returned invalid JSON')
		}
	}

	if (
		!obj ||
		typeof obj.word !== 'string' ||
		typeof obj.sourceLanguage !== 'string' ||
		typeof obj.targetLanguage !== 'string' ||
		!Array.isArray(obj.senses)
	) {
		log.error('AI dictionary JSON missing required fields', {
			rawSnippet: JSON.stringify(obj).slice(0, 200),
		})
		throw new ServiceError('AI dictionary returned malformed data')
	}

	// Perform a light normalization of senses structure
	obj.senses = (obj.senses as any[]).map((sense) => {
		const result: DictionaryAISense = {
			definition: String(sense.definition ?? '').trim(),
		}

		if (!result.definition) {
			throw new ServiceError('AI dictionary sense is missing definition')
		}

		if (sense.translation != null) {
			result.translation = String(sense.translation).trim()
		}
		if (sense.partOfSpeech != null) {
			result.partOfSpeech = String(sense.partOfSpeech).trim()
		}
		if (Array.isArray(sense.examples)) {
			result.examples = (sense.examples as any[])
				.map((ex: any) => ({
					source: ex?.source != null ? String(ex.source).trim() : '',
					target: ex?.target != null ? String(ex.target).trim() : undefined,
				}))
				.filter((ex) => ex.source)
		}
		if (sense.notes != null) {
			result.notes = String(sense.notes).trim()
		}

		return result
	})

	return {
		word: String(obj.word).trim(),
		sourceLanguage: String(obj.sourceLanguage).trim(),
		targetLanguage: String(obj.targetLanguage).trim(),
		lemma:
			obj.lemma != null && String(obj.lemma).trim()
				? String(obj.lemma).trim()
				: String(obj.word).trim(),
		ipa:
			obj.ipa != null && String(obj.ipa).trim()
				? String(obj.ipa).trim()
				: undefined,
		senses: obj.senses,
	}
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate an AI dictionary entry using Workers AI (LLM).
 *
 * NOTE: This function does not handle Credits / rate limiting. Callers are
 * responsible for enforcing Credits and other quota logic.
 */
export async function generateDictionaryAIEntry(
	ai: Ai,
	params: DictionaryAIParams
): Promise<{ result: DictionaryAIResult; usage?: DictionaryAIUsage }> {
	const model = (params.model || DEFAULT_WORKERS_AI_DICTIONARY_MODEL) as any

	const systemPrompt = buildSystemPrompt()
	const userPrompt = buildUserPrompt(params)

	const aiParams: any = {
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		],
		temperature: 0.2,
		max_tokens: 1536,
		// Enable Cloudflare Workers AI JSON Mode with an explicit schema.
		// See: https://developers.cloudflare.com/workers-ai/features/json-mode/
		response_format: {
			type: 'json_schema',
			json_schema: {
				type: 'object',
				properties: {
					word: { type: 'string' },
					sourceLanguage: { type: 'string' },
					targetLanguage: { type: 'string' },
					lemma: { type: 'string' },
					ipa: { type: 'string' },
					senses: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								definition: { type: 'string', description: 'Explanation of the word\'s meaning, written in the source language' },
								translation: { type: 'string', description: 'Equivalent word or phrase in the target language' },
								partOfSpeech: { type: 'string' },
								examples: {
									type: 'array',
									items: {
										type: 'object',
										properties: {
											source: { type: 'string' },
											target: { type: 'string' },
										},
										required: ['source'],
									},
								},
								notes: { type: 'string' },
							},
							required: ['definition'],
						},
					},
				},
				required: ['word', 'sourceLanguage', 'targetLanguage', 'lemma', 'senses'],
			},
		},
	}

	const response = await ai.run(model, aiParams)

	const raw = (response as any)?.response
	const usage = (response as any)?.usage as DictionaryAIUsage | undefined

	if (!raw) {
		log.error('Empty response from AI dictionary model', {
			responseSnippet: JSON.stringify(response || {}).slice(0, 200),
		})
		throw new ServiceError('AI dictionary generation failed')
	}

	const result = parseDictionaryResult(raw)

	return { result, usage }
}


