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
import type { ParsedCaptionsResult } from 'media-captions'

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

  // Convert to TranscriptLine format
  const timeline: TranscriptLine[] = result.cues.map((cue) => {
    // Extract plain text from cue
    // media-captions automatically strips HTML tags and provides plain text
    const text = cue.text.trim()

    return {
      text,
      start: Math.round(cue.startTime * 1000), // Convert seconds to milliseconds
      duration: Math.round((cue.endTime - cue.startTime) * 1000), // Convert to milliseconds
    }
  })

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

  const timeline: TranscriptLine[] = result.cues.map((cue) => ({
    text: cue.text.trim(),
    start: Math.round(cue.startTime * 1000),
    duration: Math.round((cue.endTime - cue.startTime) * 1000),
  }))

  return timeline
}
