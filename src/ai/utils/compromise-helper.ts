/**
 * Compromise.js Helper for English Text Enhancement
 *
 * Provides enhanced NLP capabilities for English text:
 * - Abbreviation detection (more comprehensive than manual list)
 * - Entity recognition (people, places, organizations)
 * - Sentence boundary validation
 *
 * Note: Compromise primarily supports English, so this module is only used for English text.
 */

import nlp from 'compromise'

/**
 * Check if a word is an abbreviation using Compromise
 * More comprehensive than manual abbreviation list
 */
export function isAbbreviationWithCompromise(
  text: string,
  word: string
): boolean {
  try {
    const doc = nlp(text)

    // Compromise can detect abbreviations in context
    // Check if the word with period is treated as an abbreviation
    const abbreviations = doc.abbreviations()
    const abbrevTexts = abbreviations.out('array')

    // Check if our word (with or without period) appears in abbreviations
    const wordLower = word.toLowerCase().replace(/\.+$/, '')
    return abbrevTexts.some((abbrev: string) => {
      const abbrevLower = abbrev.toLowerCase().replace(/\.+$/, '')
      return abbrevLower === wordLower
    })
  } catch (error) {
    // If Compromise fails, return false (fallback to manual detection)
    console.warn('Compromise abbreviation detection failed:', error)
    return false
  }
}

/**
 * Detect entities (people, places, organizations) in text
 * Returns positions where entities are found
 */
export interface EntityPosition {
  text: string
  start: number
  end: number
  type: 'person' | 'place' | 'organization'
}

export function detectEntitiesWithCompromise(
  text: string
): EntityPosition[] {
  try {
    const doc = nlp(text)
    const entities: EntityPosition[] = []

    // Note: Compromise's entity detection may require plugins
    // For now, we'll use a simplified approach that works with basic Compromise
    // Detect people (proper nouns that are likely names)
    try {
      const people = doc.people()
      const peopleArray = people.out('array')
      // Find positions in original text
      peopleArray.forEach((name: string) => {
        const index = text.indexOf(name)
        if (index !== -1) {
          entities.push({
            text: name,
            start: index,
            end: index + name.length,
            type: 'person',
          })
        }
      })
    } catch (e) {
      // People detection not available, skip
    }

    // Detect places
    try {
      const places = doc.places()
      const placesArray = places.out('array')
      placesArray.forEach((place: string) => {
        const index = text.indexOf(place)
        if (index !== -1) {
          entities.push({
            text: place,
            start: index,
            end: index + place.length,
            type: 'place',
          })
        }
      })
    } catch (e) {
      // Places detection not available, skip
    }

    // Detect organizations
    try {
      const organizations = doc.organizations()
      const orgsArray = organizations.out('array')
      orgsArray.forEach((org: string) => {
        const index = text.indexOf(org)
        if (index !== -1) {
          entities.push({
            text: org,
            start: index,
            end: index + org.length,
            type: 'organization',
          })
        }
      })
    } catch (e) {
      // Organizations detection not available, skip
    }

    return entities
  } catch (error) {
    console.warn('Compromise entity detection failed:', error)
    return []
  }
}

/**
 * Check if a position is within an entity
 * Used to avoid breaking segments in the middle of entity names
 */
export function isPositionInEntity(
  position: number,
  entities: EntityPosition[]
): boolean {
  return entities.some(
    (entity) => position >= entity.start && position < entity.end
  )
}

/**
 * Get sentence boundaries using Compromise
 * More accurate than simple punctuation-based detection
 */
export function getSentenceBoundariesWithCompromise(
  text: string
): number[] {
  try {
    const doc = nlp(text)
    const sentences = doc.sentences()
    const boundaries: number[] = []

    let currentIndex = 0
    sentences.forEach((sentence: any) => {
      const sentenceText = sentence.text()
      currentIndex += sentenceText.length
      boundaries.push(currentIndex)
    })

    return boundaries
  } catch (error) {
    console.warn('Compromise sentence segmentation failed:', error)
    return []
  }
}

/**
 * Enhanced abbreviation detection combining manual list and Compromise
 * For English text only
 */
export function detectAbbreviationsEnhanced(
  text: string,
  word: string,
  manualList: Set<string>
): boolean {
  // First check manual list (fast)
  const wordLower = word.toLowerCase().replace(/\.+$/, '')
  if (manualList.has(wordLower)) {
    return true
  }

      // Then check with Compromise (more comprehensive)
      return isAbbreviationWithCompromise(text, word)
}

/**
 * Meaning Group (意群) boundaries detected using Compromise
 * Represents semantic units that should ideally stay together
 */
export interface MeaningGroupBoundary {
  start: number // Character position in text
  end: number // Character position in text
  type: 'prepositional' | 'relative-clause' | 'object-clause' | 'noun-phrase' | 'verb-phrase' | 'infinitive' | 'participle'
  text: string // The actual text of the meaning group
}

/**
 * Detect meaning groups (意群) in English text using Compromise
 * Identifies semantic units that should ideally stay together:
 * - Prepositional phrases (e.g., "as a social psychologist")
 * - Relative clauses (e.g., "who has been trying...")
 * - Object clauses (e.g., "what onearth was happening...")
 * - Noun phrases
 * - Verb phrases
 * - Infinitive phrases (e.g., "to figure out")
 * - Participle phrases
 *
 * @param text - English text to analyze
 * @returns Array of meaning group boundaries with their positions
 */
export function detectMeaningGroups(
  text: string
): MeaningGroupBoundary[] {
  try {
    const doc = nlp(text)
    const groups: MeaningGroupBoundary[] = []

    // 1. Detect prepositional phrases (e.g., "as a social psychologist", "since 2015")
    // Pattern: preposition + (article/determiner) + noun phrase
    try {
      // Try multiple patterns to catch different prepositional phrase structures
      const patterns = [
        '#Preposition+ #Determiner? #Adjective? #Noun+', // "as a social psychologist"
        '#Preposition+ #Determiner? #Noun+', // "since 2015", "to the store"
        '#Preposition+ #Noun+', // "since 2015" (without determiner)
      ]

      for (const pattern of patterns) {
        try {
          const prepPhrases = doc.match(pattern)
          prepPhrases.forEach((phrase: any) => {
            const phraseText = phrase.text()
            const index = text.indexOf(phraseText)
            if (index !== -1) {
              groups.push({
                start: index,
                end: index + phraseText.length,
                type: 'prepositional',
                text: phraseText,
              })
            }
          })
        } catch (e) {
          // Pattern failed, try next
        }
      }
    } catch (e) {
      // Prepositional phrase detection failed, continue
    }

    // 2. Detect relative clauses (e.g., "who has been trying", "which is...")
    // Pattern: relative pronoun (who, which, that, whom, whose) + verb phrase
    try {
      // Try to match longer relative clauses that include more context
      const relativeClauses = doc.match('(who|which|that|whom|whose) #Verb+ .+')
      relativeClauses.forEach((clause: any) => {
        const clauseText = clause.text()
        // Limit clause length to avoid matching entire sentence
        const words = clauseText.split(/\s+/)
        if (words.length <= 15) { // Reasonable limit for a clause
          const index = text.indexOf(clauseText)
          if (index !== -1) {
            groups.push({
              start: index,
              end: index + clauseText.length,
              type: 'relative-clause',
              text: clauseText,
            })
          }
        }
      })

      // Also try shorter pattern for cases where longer pattern doesn't match
      const shortRelativeClauses = doc.match('(who|which|that|whom|whose) #Verb+')
      shortRelativeClauses.forEach((clause: any) => {
        const clauseText = clause.text()
        const index = text.indexOf(clauseText)
        if (index !== -1) {
          // Check if this clause is already in groups
          const alreadyExists = groups.some(g =>
            g.type === 'relative-clause' &&
            g.start <= index &&
            g.end >= index + clauseText.length
          )
          if (!alreadyExists) {
            groups.push({
              start: index,
              end: index + clauseText.length,
              type: 'relative-clause',
              text: clauseText,
            })
          }
        }
      })
    } catch (e) {
      // Relative clause detection failed, continue
    }

    // 3. Detect object clauses (e.g., "what onearth was happening", "that he said")
    // Pattern: question word (what, how, why, when, where) or "that" + verb phrase
    try {
      const objectClauses = doc.match('(what|how|why|when|where|that) #Verb+')
      objectClauses.forEach((clause: any) => {
        const clauseText = clause.text()
        const index = text.indexOf(clauseText)
        if (index !== -1) {
          groups.push({
            start: index,
            end: index + clauseText.length,
            type: 'object-clause',
            text: clauseText,
          })
        }
      })
    } catch (e) {
      // Object clause detection failed, continue
    }

    // 4. Detect infinitive phrases (e.g., "to figure out", "to understand")
    // Pattern: "to" + verb + (adverb/preposition) + (object)
    try {
      const infinitivePhrases = doc.match('to #Verb+')
      infinitivePhrases.forEach((phrase: any) => {
        const phraseText = phrase.text()
        const index = text.indexOf(phraseText)
        if (index !== -1) {
          groups.push({
            start: index,
            end: index + phraseText.length,
            type: 'infinitive',
            text: phraseText,
          })
        }
      })
    } catch (e) {
      // Infinitive phrase detection failed, continue
    }

    // 5. Detect noun phrases (longer ones that might be meaning groups)
    // Pattern: (determiner) + adjective* + noun + (prepositional phrase)
    try {
      const nounPhrases = doc.nouns()
      nounPhrases.forEach((np: any) => {
        const npText = np.text()
        // Only consider longer noun phrases (3+ words) as potential meaning groups
        const words = npText.split(/\s+/).filter((w: string) => w.length > 0)
        if (words.length >= 3) {
          const index = text.indexOf(npText)
          if (index !== -1) {
            groups.push({
              start: index,
              end: index + npText.length,
              type: 'noun-phrase',
              text: npText,
            })
          }
        }
      })
    } catch (e) {
      // Noun phrase detection failed, continue
    }

    // 6. Detect verb phrases (complex ones with auxiliaries)
    // Pattern: auxiliary verb + (adverb) + main verb
    try {
      const verbPhrases = doc.verbs()
      verbPhrases.forEach((vp: any) => {
        const vpText = vp.text()
        // Only consider longer verb phrases (3+ words) as potential meaning groups
        const words = vpText.split(/\s+/).filter((w: string) => w.length > 0)
        if (words.length >= 3) {
          const index = text.indexOf(vpText)
          if (index !== -1) {
            groups.push({
              start: index,
              end: index + vpText.length,
              type: 'verb-phrase',
              text: vpText,
            })
          }
        }
      })
    } catch (e) {
      // Verb phrase detection failed, continue
    }

    // Sort by start position and merge overlapping groups
    groups.sort((a, b) => a.start - b.start)
    return mergeOverlappingGroups(groups)
  } catch (error) {
    console.warn('Compromise meaning group detection failed:', error)
    return []
  }
}

/**
 * Merge overlapping meaning groups, keeping the longer one
 */
function mergeOverlappingGroups(
  groups: MeaningGroupBoundary[]
): MeaningGroupBoundary[] {
  if (groups.length <= 1) {
    return groups
  }

  const merged: MeaningGroupBoundary[] = []
  let current = groups[0]

  for (let i = 1; i < groups.length; i++) {
    const next = groups[i]

    // Check if groups overlap
    if (next.start < current.end) {
      // Overlapping: merge by keeping the longer one
      const currentLength = current.end - current.start
      const nextLength = next.end - next.start

      if (nextLength > currentLength) {
        current = next
      }
      // Otherwise keep current
    } else {
      // No overlap: save current and move to next
      merged.push(current)
      current = next
    }
  }

  merged.push(current)
  return merged
}

/**
 * Check if a position is at a meaning group boundary
 * Returns true if position is at the start or end of a meaning group
 */
export function isMeaningGroupBoundary(
  position: number,
  groups: MeaningGroupBoundary[]
): boolean {
  return groups.some(
    (group) => position === group.start || position === group.end
  )
}

/**
 * Check if a position is within a meaning group
 * Returns true if position is inside a meaning group (not at boundaries)
 */
export function isPositionInMeaningGroup(
  position: number,
  groups: MeaningGroupBoundary[]
): boolean {
  return groups.some(
    (group) => position > group.start && position < group.end
  )
}

