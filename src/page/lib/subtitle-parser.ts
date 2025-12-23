/**
 * Subtitle File Parser
 *
 * Uses the media-captions library to parse subtitle files (SRT, VTT, SSA/ASS)
 * and convert them to transcript timeline format.
 *
 * Benefits:
 * - Handles VTT HTML tags (<c>, <b>, <i>, <u>, etc.)
 * - Supports VTT color codes (<c.red>, <c#FF0000>)
 * - Supports VTT regions and cue settings
 * - Better error handling and edge case support
 * - Supports SSA/ASS format
 * - Stream processing for large files
 *
 * Note: Uses dynamic import to avoid SSR issues since this is only used client-side.
 */

import type { TranscriptLine } from '@/page/types/db'
import type { ParsedCaptionsResult, VTTNode, VTTextNode } from 'media-captions'

/**
 * Dynamically import media-captions to avoid SSR issues
 * This library accesses window on import, so we only load it client-side
 */
async function getMediaCaptions() {
  if (typeof window === 'undefined') {
    throw new Error('Subtitle parsing is only available in the browser')
  }
  return await import('media-captions')
}

/**
 * Extract plain text from VTT tokens recursively
 *
 * Uses media-captions' tokenizeVTTCue to properly extract text nodes,
 * which handles VTT format correctly. For other formats (SSA/ASS),
 * falls back to manual HTML stripping.
 *
 * @param tokens - VTT tokens from tokenizeVTTCue
 * @returns Plain text extracted from all text nodes
 */
function extractTextFromTokens(tokens: VTTNode[]): string {
  const textParts: string[] = []

  for (const token of tokens) {
    if (token.type === 'text') {
      // This is a text node - extract the data
      textParts.push((token as VTTextNode).data)
    } else if ('children' in token && token.children) {
      // This is a block node - recursively extract text from children
      textParts.push(extractTextFromTokens(token.children))
    }
  }

  return textParts.join('')
}

/**
 * Strip all HTML tags and style codes from text (fallback method)
 *
 * Used when tokenizeVTTCue is not available or for formats that don't support it.
 * Removes:
 * - HTML tags: <font>, <b>, <i>, <u>, <c>, <v>, <ruby>, <rt>, etc.
 * - HTML entities: &nbsp;, &amp;, etc.
 * - SSA/ASS style codes: {\an8}, {\pos}, etc.
 *
 * @param text - Text that may contain HTML tags and style codes
 * @returns Plain text without any formatting
 */
function stripHtmlAndStyles(text: string): string {
  if (!text) return ''

  let cleaned = text

  // Remove SSA/ASS style codes: {\an8}, {\pos(x,y)}, {\fad}, {\r}, etc.
  cleaned = cleaned.replace(/\{[^}]*\}/g, '')

  // Remove HTML tags (including attributes)
  // Matches: <tag>, <tag attr="value">, </tag>, <tag/>
  cleaned = cleaned.replace(/<[^>]+>/g, '')

  // Decode common HTML entities
  const entityMap: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp': ' ',
    '&amp': '&',
    '&lt': '<',
    '&gt': '>',
    '&quot': '"',
  }

  // Replace named entities
  for (const [entity, char] of Object.entries(entityMap)) {
    cleaned = cleaned.replace(new RegExp(entity, 'gi'), char)
  }

  // Replace numeric entities: &#123; or &#x1F;
  cleaned = cleaned.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  cleaned = cleaned.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  // If in browser, use DOM for more accurate entity decoding
  if (typeof document !== 'undefined') {
    try {
      const temp = document.createElement('div')
      temp.innerHTML = cleaned
      cleaned = temp.textContent || temp.innerText || cleaned
    } catch {
      // If DOM parsing fails, use the already cleaned text
    }
  }

  // Clean up whitespace: normalize multiple spaces/newlines to single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

/**
 * Get plain text from a VTTCue
 *
 * Uses media-captions' tokenizeVTTCue for VTT format (which properly handles
 * VTT tags), and falls back to manual stripping for other formats.
 *
 * @param cue - VTTCue object from media-captions
 * @param mediaCaptions - The media-captions module (dynamically imported)
 * @returns Plain text without any formatting
 */
async function getPlainTextFromCue(
  cue: any,
  mediaCaptions: any
): Promise<string> {
  // Try using tokenizeVTTCue for proper VTT parsing
  // This is the recommended way to extract text from VTT cues
  if (mediaCaptions.tokenizeVTTCue && typeof mediaCaptions.tokenizeVTTCue === 'function') {
    try {
      const tokens = mediaCaptions.tokenizeVTTCue(cue)
      const plainText = extractTextFromTokens(tokens)
      if (plainText.trim()) {
        return plainText.trim()
      }
    } catch {
      // If tokenization fails, fall back to manual stripping
    }
  }

  // Fallback: use cue.text and manually strip HTML
  // This handles cases where tokenizeVTTCue is not available or fails
  const text = cue.text || ''
  return stripHtmlAndStyles(text)
}

/**
 * Parse subtitle file using media-captions library
 *
 * Supports:
 * - VTT with HTML tags (<c>, <b>, <i>, <u>, etc.)
 * - VTT with color codes (<c.red>, <c#FF0000>)
 * - VTT regions and cue settings
 * - SRT format
 * - SSA/ASS format (basic support)
 *
 * @param file - Subtitle file to parse
 * @returns Array of transcript lines
 * @throws Error if parsing fails
 */
export async function parseSubtitleFile(file: File): Promise<TranscriptLine[]> {
  const content = await file.text()
  const fileName = file.name.toLowerCase()

  // Determine file type
  let type: 'vtt' | 'srt' | 'ssa' | undefined
  if (fileName.endsWith('.vtt')) {
    type = 'vtt'
  } else if (fileName.endsWith('.srt')) {
    type = 'srt'
  } else if (fileName.endsWith('.ssa') || fileName.endsWith('.ass')) {
    type = 'ssa'
  } else {
    // Auto-detect from content
    if (content.trim().startsWith('WEBVTT')) {
      type = 'vtt'
    } else if (content.includes('[Script Info]') || content.includes('[Events]')) {
      type = 'ssa'
    } else {
      type = 'srt' // Default to SRT
    }
  }

  // Dynamically import and parse using media-captions
  const { parseText } = await getMediaCaptions()
  const result: ParsedCaptionsResult = await parseText(content, { type })

  // Check for parsing errors
  if (result.errors && result.errors.length > 0) {
    const errorMessage = result.errors[0].message || 'Unknown parsing error'
    throw new Error(`Failed to parse subtitle file: ${errorMessage}`)
  }

  // Check if we have any cues
  if (!result.cues || result.cues.length === 0) {
    throw new Error('Subtitle file contains no valid cues')
  }

  // Get media-captions module once for all cues
  const mediaCaptions = await getMediaCaptions()

  // Convert to TranscriptLine format
  const timeline: TranscriptLine[] = await Promise.all(
    result.cues.map(async (cue) => {
      // Extract plain text from cue using media-captions' tokenizeVTTCue
      // This properly handles VTT format tags and extracts only text nodes
      const text = await getPlainTextFromCue(cue, mediaCaptions)

      return {
        text,
        start: Math.round(cue.startTime * 1000), // Convert seconds to milliseconds
        duration: Math.round((cue.endTime - cue.startTime) * 1000), // Convert to milliseconds
      }
    })
  )

  return timeline
}

/**
 * Parse subtitle from Response (useful for streaming or server-side)
 *
 * @param response - Response containing subtitle content
 * @param type - Optional file type hint (vtt, srt, ssa)
 * @returns Array of transcript lines
 * @throws Error if parsing fails
 */
export async function parseSubtitleFromResponse(
  response: Response,
  type?: 'vtt' | 'srt' | 'ssa'
): Promise<TranscriptLine[]> {
  // Dynamically import and parse using media-captions
  const { parseResponse } = await getMediaCaptions()
  const result: ParsedCaptionsResult = await parseResponse(response, { type })

  // Check for parsing errors
  if (result.errors && result.errors.length > 0) {
    const errorMessage = result.errors[0].message || 'Unknown parsing error'
    throw new Error(`Failed to parse subtitle: ${errorMessage}`)
  }

  // Check if we have any cues
  if (!result.cues || result.cues.length === 0) {
    throw new Error('Subtitle file contains no valid cues')
  }

  const mediaCaptions = await getMediaCaptions()
  const timeline: TranscriptLine[] = await Promise.all(
    result.cues.map(async (cue) => {
      // Extract plain text from cue using media-captions' tokenizeVTTCue
      const text = await getPlainTextFromCue(cue, mediaCaptions)

      return {
        text,
        start: Math.round(cue.startTime * 1000),
        duration: Math.round((cue.endTime - cue.startTime) * 1000),
      }
    })
  )

  return timeline
}
