/**
 * AI Dictionary Service (LLM-based)
 *
 * Encapsulates prompt construction and LLM call for dictionary-style lookups.
 */

import { DEFAULT_WORKERS_AI_TEXT_MODEL } from '@/ai/constants'
import { ServiceError } from '@/worker/utils/errors'
import { createLogger } from '@/lib/utils'

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
		'You are an AI-powered bilingual learner dictionary for language learners.',
		'Your job is to explain a single word in a clear, structured way.',
		'You must respond strictly in compact JSON, with no markdown, text, or comments outside JSON.',
		'The JSON MUST follow this TypeScript-style schema:',
		'{"word": string,                 // user query word as given',
		'"sourceLanguage": string,',
		'"targetLanguage": string,',
		'"lemma": string,                // optional canonical base form, e.g. "run" for "running"; omit if unknown',
		'"ipa": string,                  // optional IPA pronunciation for the headword in source language, e.g. "/rʌn/"; omit if unknown',
		'"senses": [',
		'  {',
		'    "definition": string,              // explanation in source language, short and clear',
		'    "translation": string,             // main translation in target language',
		'    "partOfSpeech": string,           // e.g. "verb", "noun", "phrasal verb"',
		'    "examples": [',
		'      { "source": string, "target": string } // source/target bilingual example sentence',
		'    ],',
		'    "notes": string                    // optional usage notes; omit if not needed',
		'  }',
		']}',
		'Rules:',
		'- Include 1–3 main senses in "senses".',
		'- Each sense should have at least 1 example sentence, preferably bilingual.',
		'- Make explanations concise but informative for intermediate learners.',
		'- Do NOT include any keys with null/undefined; just omit them.',
		'- If the word is nonsense, a typo you cannot safely correct, or there is no reliable dictionary entry, return an empty array for "senses" and do NOT hallucinate definitions. You may still keep "word", "sourceLanguage", and "targetLanguage" filled.',
		'- Output ONLY valid JSON. Do not wrap in markdown, do not add extra text.',
	].join('\n')
}

/**
 * Build the user prompt for the AI dictionary.
 */
function buildUserPrompt(params: DictionaryAIParams): string {
	const { word, sourceLang, targetLang } = params

	return [
		`Word: "${word}"`,
		`Source language (definition language): ${sourceLang}`,
		`Target language (translation language): ${targetLang}`,
		'Explain it like a good bilingual learner dictionary, following the JSON schema exactly.',
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
				: undefined,
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
	const model = (params.model || DEFAULT_WORKERS_AI_TEXT_MODEL) as any

	const systemPrompt = buildSystemPrompt()
	const userPrompt = buildUserPrompt(params)

	const aiParams: any = {
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		],
		temperature: 0.4,
		max_tokens: 1024,
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
								definition: { type: 'string' },
								translation: { type: 'string' },
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
				required: ['word', 'sourceLanguage', 'targetLanguage', 'senses'],
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


