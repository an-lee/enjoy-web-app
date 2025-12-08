/**
 * Tests for ID Generator
 * Ensures deterministic UUID generation for entity IDs
 */

import { describe, it, expect } from 'vitest'
import {
  generateVideoId,
  generateAudioId,
  generateTTSAudioId,
  generateTranscriptId,
  generateRecordingId,
  generateDictationId,
  generateTranslationId,
  generateCachedDefinitionId,
} from './id-generator'

describe('ID Generator', () => {
  describe('generateVideoId', () => {
    it('should generate consistent UUID v5 for same provider and vid', () => {
      const id1 = generateVideoId('youtube', 'dQw4w9WgXcQ')
      const id2 = generateVideoId('youtube', 'dQw4w9WgXcQ')
      expect(id1).toBe(id2)
    })

    it('should generate different UUIDs for different vids', () => {
      const id1 = generateVideoId('youtube', 'video1')
      const id2 = generateVideoId('youtube', 'video2')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different providers', () => {
      const id1 = generateVideoId('youtube', 'video1')
      const id2 = generateVideoId('netflix', 'video1')
      expect(id1).not.toBe(id2)
    })

    it('should return valid UUID format', () => {
      const id = generateVideoId('youtube', 'test')
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidRegex)
    })
  })

  describe('generateAudioId', () => {
    it('should generate consistent UUID v5 for same provider and aid', () => {
      const id1 = generateAudioId('local', 'audio123')
      const id2 = generateAudioId('local', 'audio123')
      expect(id1).toBe(id2)
    })

    it('should generate different UUIDs for different aids', () => {
      const id1 = generateAudioId('local', 'audio1')
      const id2 = generateAudioId('local', 'audio2')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different providers', () => {
      const id1 = generateAudioId('local', 'audio1')
      const id2 = generateAudioId('tts', 'audio1')
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateTTSAudioId', () => {
    it('should generate consistent UUID for same text and voice', () => {
      const id1 = generateTTSAudioId('Hello world', 'en-US-Jenny')
      const id2 = generateTTSAudioId('Hello world', 'en-US-Jenny')
      expect(id1).toBe(id2)
    })

    it('should generate different UUIDs for different texts', () => {
      const id1 = generateTTSAudioId('Hello', 'en-US-Jenny')
      const id2 = generateTTSAudioId('World', 'en-US-Jenny')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different voices', () => {
      const id1 = generateTTSAudioId('Hello', 'en-US-Jenny')
      const id2 = generateTTSAudioId('Hello', 'en-GB-Ryan')
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateTranscriptId', () => {
    it('should generate consistent UUID for same parameters', () => {
      const id1 = generateTranscriptId('video', 'vid-123', 'en', 'whisper')
      const id2 = generateTranscriptId('video', 'vid-123', 'en', 'whisper')
      expect(id1).toBe(id2)
    })

    it('should generate different UUIDs for different target types', () => {
      const id1 = generateTranscriptId('video', 'target-123', 'en', 'whisper')
      const id2 = generateTranscriptId('audio', 'target-123', 'en', 'whisper')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different languages', () => {
      const id1 = generateTranscriptId('video', 'vid-123', 'en', 'whisper')
      const id2 = generateTranscriptId('video', 'vid-123', 'ja', 'whisper')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different sources', () => {
      const id1 = generateTranscriptId('video', 'vid-123', 'en', 'whisper')
      const id2 = generateTranscriptId('video', 'vid-123', 'en', 'manual')
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateRecordingId', () => {
    it('should generate random UUID v4', () => {
      const id1 = generateRecordingId()
      const id2 = generateRecordingId()
      expect(id1).not.toBe(id2)
    })

    it('should return valid UUID format', () => {
      const id = generateRecordingId()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidRegex)
    })
  })

  describe('generateDictationId', () => {
    it('should generate random UUID v4', () => {
      const id1 = generateDictationId()
      const id2 = generateDictationId()
      expect(id1).not.toBe(id2)
    })

    it('should return valid UUID format', () => {
      const id = generateDictationId()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidRegex)
    })
  })

  describe('generateTranslationId', () => {
    it('should generate consistent UUID for same parameters', () => {
      const id1 = generateTranslationId('Hello world', 'zh', 'natural')
      const id2 = generateTranslationId('Hello world', 'zh', 'natural')
      expect(id1).toBe(id2)
    })

    it('should generate different UUIDs for different source texts', () => {
      const id1 = generateTranslationId('Hello', 'zh', 'natural')
      const id2 = generateTranslationId('World', 'zh', 'natural')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different target languages', () => {
      const id1 = generateTranslationId('Hello', 'zh', 'natural')
      const id2 = generateTranslationId('Hello', 'ja', 'natural')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different styles', () => {
      const id1 = generateTranslationId('Hello', 'zh', 'natural')
      const id2 = generateTranslationId('Hello', 'zh', 'formal')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs with custom prompts', () => {
      const id1 = generateTranslationId('Hello', 'zh', 'custom', 'prompt1')
      const id2 = generateTranslationId('Hello', 'zh', 'custom', 'prompt2')
      expect(id1).not.toBe(id2)
    })

    it('should treat undefined custom prompt as empty string', () => {
      const id1 = generateTranslationId('Hello', 'zh', 'natural', undefined)
      const id2 = generateTranslationId('Hello', 'zh', 'natural', '')
      expect(id1).toBe(id2)
    })
  })

  describe('generateCachedDefinitionId', () => {
    it('should generate consistent UUID for same word and language pair', () => {
      const id1 = generateCachedDefinitionId('hello', 'en-zh')
      const id2 = generateCachedDefinitionId('hello', 'en-zh')
      expect(id1).toBe(id2)
    })

    it('should generate different UUIDs for different words', () => {
      const id1 = generateCachedDefinitionId('hello', 'en-zh')
      const id2 = generateCachedDefinitionId('world', 'en-zh')
      expect(id1).not.toBe(id2)
    })

    it('should generate different UUIDs for different language pairs', () => {
      const id1 = generateCachedDefinitionId('hello', 'en-zh')
      const id2 = generateCachedDefinitionId('hello', 'en-ja')
      expect(id1).not.toBe(id2)
    })
  })

  // Note: Blob-based tests (hashBlob, generateLocalVideoId, generateLocalAudioId) are
  // skipped in unit tests due to jsdom limitations with Blob.arrayBuffer().
  // These functions should be tested with integration tests in a real browser environment.
})
