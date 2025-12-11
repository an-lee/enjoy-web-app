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

