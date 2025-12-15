/**
 * Tests for EchoSession Repository
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { EchoSession, EchoSessionInput } from '@/types/db'

// Create in-memory data store
const echoSessionData = new Map<string, EchoSession>()

// Mock the database module BEFORE importing the repository
vi.mock('../schema', () => ({
  db: {
    echoSessions: {
      get: vi.fn((id: string) => Promise.resolve(echoSessionData.get(id))),
      put: vi.fn((item: EchoSession) => {
        echoSessionData.set(item.id, item)
        return Promise.resolve(item.id)
      }),
      update: vi.fn((id: string, changes: Partial<EchoSession>) => {
        const existing = echoSessionData.get(id)
        if (existing) {
          echoSessionData.set(id, { ...existing, ...changes })
          return Promise.resolve(1)
        }
        return Promise.resolve(0)
      }),
      delete: vi.fn((id: string) => {
        echoSessionData.delete(id)
        return Promise.resolve()
      }),
      toArray: vi.fn(() => Promise.resolve(Array.from(echoSessionData.values()))),
      where: vi.fn((index: string) => ({
        equals: vi.fn((value: unknown) => ({
          toArray: vi.fn(async () => {
            const results: EchoSession[] = []
            for (const item of echoSessionData.values()) {
              if (index.startsWith('[')) {
                // Compound index [targetType+targetId]
                const fields = index.slice(1, -1).split('+')
                const values = value as unknown[]
                const matches = fields.every((field, i) => {
                  const fieldValue = (item as any)[field]
                  const compareValue = values[i]
                  return fieldValue === compareValue
                })
                if (matches) results.push(item)
              } else if ((item as any)[index] === value) {
                results.push(item)
              }
            }
            return results
          }),
        })),
      })),
      filter: vi.fn((predicate: (item: EchoSession) => boolean) => ({
        toArray: vi.fn(async () => {
          return Array.from(echoSessionData.values()).filter(predicate)
        }),
      })),
    },
  },
}))

// Mock ID generator
vi.mock('../id-generator', () => ({
  generateEchoSessionId: vi.fn(() => `mock-echo-session-${Date.now()}-${Math.random()}`),
}))

// Import AFTER mocking
import {
  getEchoSessionById,
  getEchoSessionsByTarget,
  getLatestEchoSessionByTarget,
  getActiveEchoSessionByTarget,
  getOrCreateActiveEchoSession,
  updateEchoSessionProgress,
  saveEchoSession,
  completeEchoSession,
  deleteEchoSession,
  echoSessionRepository,
} from './echo-session-repository'
import { db } from '../schema'
import { generateEchoSessionId } from '../id-generator'

describe('EchoSession Repository', () => {
  beforeEach(() => {
    // Clear mock data
    echoSessionData.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createTestEchoSession = (overrides: Partial<EchoSession> = {}): EchoSession => {
    const now = new Date().toISOString()
    return {
      id: 'test-echo-session-1',
      targetType: 'Audio',
      targetId: 'test-audio-1',
      language: 'en',
      currentTime: 0,
      playbackRate: 1,
      volume: 1,
      recordingsCount: 0,
      recordingsDuration: 0,
      startedAt: now,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  }

  describe('Query Operations', () => {
    describe('getEchoSessionById', () => {
      it('should return session when found', async () => {
        const session = createTestEchoSession()
        echoSessionData.set(session.id, session)

        const result = await getEchoSessionById(session.id)
        expect(result).toEqual(session)
        expect(db.echoSessions.get).toHaveBeenCalledWith(session.id)
      })

      it('should return undefined when not found', async () => {
        const result = await getEchoSessionById('non-existent-id')
        expect(result).toBeUndefined()
      })
    })

    describe('getEchoSessionsByTarget', () => {
      it('should return all sessions for a target', async () => {
        const session1 = createTestEchoSession({
          id: 'session-1',
          targetType: 'Audio',
          targetId: 'audio-1',
        })
        const session2 = createTestEchoSession({
          id: 'session-2',
          targetType: 'Audio',
          targetId: 'audio-1',
        })
        const session3 = createTestEchoSession({
          id: 'session-3',
          targetType: 'Audio',
          targetId: 'audio-2',
        })
        echoSessionData.set(session1.id, session1)
        echoSessionData.set(session2.id, session2)
        echoSessionData.set(session3.id, session3)

        const results = await getEchoSessionsByTarget('Audio', 'audio-1')
        expect(results).toHaveLength(2)
        expect(results.map((r) => r.id)).toContain('session-1')
        expect(results.map((r) => r.id)).toContain('session-2')
      })
    })

    describe('getLatestEchoSessionByTarget', () => {
      it('should return most recent session by lastActiveAt', async () => {
        const now = Date.now()
        const session1 = createTestEchoSession({
          id: 'session-1',
          targetType: 'Audio',
          targetId: 'audio-1',
          lastActiveAt: new Date(now - 10000).toISOString(), // Older
        })
        const session2 = createTestEchoSession({
          id: 'session-2',
          targetType: 'Audio',
          targetId: 'audio-1',
          lastActiveAt: new Date(now - 5000).toISOString(), // Newer
        })
        const session3 = createTestEchoSession({
          id: 'session-3',
          targetType: 'Audio',
          targetId: 'audio-1',
          lastActiveAt: new Date(now).toISOString(), // Newest
        })
        echoSessionData.set(session1.id, session1)
        echoSessionData.set(session2.id, session2)
        echoSessionData.set(session3.id, session3)

        const result = await getLatestEchoSessionByTarget('Audio', 'audio-1')
        expect(result?.id).toBe('session-3')
      })

      it('should return undefined when no sessions exist', async () => {
        const result = await getLatestEchoSessionByTarget('Audio', 'non-existent')
        expect(result).toBeUndefined()
      })
    })

    describe('getActiveEchoSessionByTarget', () => {
      it('should return only active (not completed) session', async () => {
        const activeSession = createTestEchoSession({
          id: 'active-session',
          targetType: 'Audio',
          targetId: 'audio-1',
          completedAt: undefined,
        })
        const completedSession = createTestEchoSession({
          id: 'completed-session',
          targetType: 'Audio',
          targetId: 'audio-1',
          completedAt: new Date().toISOString(),
        })
        echoSessionData.set(activeSession.id, activeSession)
        echoSessionData.set(completedSession.id, completedSession)

        const result = await getActiveEchoSessionByTarget('Audio', 'audio-1')
        expect(result?.id).toBe('active-session')
        expect(result?.completedAt).toBeUndefined()
      })

      it('should return most recent active session if multiple exist', async () => {
        const now = Date.now()
        const session1 = createTestEchoSession({
          id: 'active-1',
          targetType: 'Audio',
          targetId: 'audio-1',
          lastActiveAt: new Date(now - 5000).toISOString(),
        })
        const session2 = createTestEchoSession({
          id: 'active-2',
          targetType: 'Audio',
          targetId: 'audio-1',
          lastActiveAt: new Date(now).toISOString(), // Newest
        })
        echoSessionData.set(session1.id, session1)
        echoSessionData.set(session2.id, session2)

        const result = await getActiveEchoSessionByTarget('Audio', 'audio-1')
        expect(result?.id).toBe('active-2')
      })

      it('should return undefined when no active sessions exist', async () => {
        const completedSession = createTestEchoSession({
          id: 'completed-session',
          targetType: 'Audio',
          targetId: 'audio-1',
          completedAt: new Date().toISOString(),
        })
        echoSessionData.set(completedSession.id, completedSession)

        const result = await getActiveEchoSessionByTarget('Audio', 'audio-1')
        expect(result).toBeUndefined()
      })
    })

    describe('getOrCreateActiveEchoSession', () => {
      it('should return existing active session if available', async () => {
        const oldTime = new Date(Date.now() - 10000).toISOString() // 10 seconds ago
        const existingSession = createTestEchoSession({
          id: 'existing-active',
          targetType: 'Audio',
          targetId: 'audio-1',
          currentTime: 45,
          playbackRate: 1.5,
          volume: 0.8,
          lastActiveAt: oldTime,
          updatedAt: oldTime,
        })
        echoSessionData.set(existingSession.id, existingSession)

        const result = await getOrCreateActiveEchoSession(
          'Audio',
          'audio-1',
          'en',
          { currentTime: 0 }
        )

        expect(result).toBe(existingSession.id)
        // Should update lastActiveAt
        const updated = echoSessionData.get(existingSession.id)
        expect(updated?.lastActiveAt).not.toBe(existingSession.lastActiveAt)
        expect(new Date(updated!.lastActiveAt).getTime()).toBeGreaterThan(
          new Date(existingSession.lastActiveAt).getTime()
        )
      })

      it('should create new session if no active session exists', async () => {
        const completedSession = createTestEchoSession({
          id: 'completed-session',
          targetType: 'Audio',
          targetId: 'audio-1',
          completedAt: new Date().toISOString(),
        })
        echoSessionData.set(completedSession.id, completedSession)

        const result = await getOrCreateActiveEchoSession(
          'Audio',
          'audio-1',
          'en',
          {
            currentTime: 0,
            playbackRate: 1.2,
            volume: 0.9,
          }
        )

        expect(result).toBeTruthy()
        expect(result).not.toBe(completedSession.id)

        const newSession = echoSessionData.get(result)
        expect(newSession).toBeTruthy()
        expect(newSession?.targetType).toBe('Audio')
        expect(newSession?.targetId).toBe('audio-1')
        expect(newSession?.language).toBe('en')
        expect(newSession?.currentTime).toBe(0)
        expect(newSession?.playbackRate).toBe(1.2)
        expect(newSession?.volume).toBe(0.9)
        expect(newSession?.completedAt).toBeUndefined()
      })

      it('should create new session if no sessions exist', async () => {
        const result = await getOrCreateActiveEchoSession(
          'Video',
          'video-1',
          'ja',
          { currentTime: 10 }
        )

        expect(result).toBeTruthy()
        expect(generateEchoSessionId).toHaveBeenCalled()

        const newSession = echoSessionData.get(result)
        expect(newSession).toBeTruthy()
        expect(newSession?.targetType).toBe('Video')
        expect(newSession?.targetId).toBe('video-1')
        expect(newSession?.language).toBe('ja')
        expect(newSession?.currentTime).toBe(10)
        expect(newSession?.recordingsCount).toBe(0)
        expect(newSession?.recordingsDuration).toBe(0)
      })

      it('should use default values when initial values not provided', async () => {
        const result = await getOrCreateActiveEchoSession('Audio', 'audio-1', 'en')

        const newSession = echoSessionData.get(result)
        expect(newSession?.currentTime).toBe(0)
        expect(newSession?.playbackRate).toBe(1)
        expect(newSession?.volume).toBe(1)
      })

      it('should ensure only one active session per media', async () => {
        // Create first active session
        const firstId = await getOrCreateActiveEchoSession('Audio', 'audio-1', 'en')

        // Try to create another for same media
        const secondId = await getOrCreateActiveEchoSession('Audio', 'audio-1', 'en')

        // Should return the same session ID
        expect(secondId).toBe(firstId)

        // Should only have one active session
        const activeSessions = Array.from(echoSessionData.values()).filter(
          (s) => s.targetType === 'Audio' && s.targetId === 'audio-1' && !s.completedAt
        )
        expect(activeSessions).toHaveLength(1)
      })
    })
  })

  describe('Mutation Operations', () => {
    describe('saveEchoSession', () => {
      it('should create new session with generated ID', async () => {
        const now = new Date().toISOString()
        const input: EchoSessionInput = {
          targetType: 'Audio',
          targetId: 'audio-1',
          language: 'en',
          currentTime: 30,
          playbackRate: 1.5,
          volume: 0.8,
          startedAt: now,
          lastActiveAt: now,
        }

        const id = await saveEchoSession(input)

        expect(generateEchoSessionId).toHaveBeenCalled()
        expect(id).toBeTruthy()
        expect(db.echoSessions.put).toHaveBeenCalled()

        const saved = echoSessionData.get(id)
        expect(saved).toBeTruthy()
        expect(saved?.targetType).toBe('Audio')
        expect(saved?.targetId).toBe('audio-1')
        expect(saved?.currentTime).toBe(30)
        expect(saved?.recordingsCount).toBe(0)
        expect(saved?.recordingsDuration).toBe(0)
      })

      it('should use provided recordingsCount and recordingsDuration', async () => {
        const now = new Date().toISOString()
        const input: EchoSessionInput = {
          targetType: 'Audio',
          targetId: 'audio-1',
          language: 'en',
          currentTime: 0,
          playbackRate: 1,
          volume: 1,
          recordingsCount: 5,
          recordingsDuration: 10000,
          startedAt: now,
          lastActiveAt: now,
        }

        const id = await saveEchoSession(input)
        const saved = echoSessionData.get(id)
        expect(saved?.recordingsCount).toBe(5)
        expect(saved?.recordingsDuration).toBe(10000)
      })
    })

    describe('updateEchoSessionProgress', () => {
      it('should update progress fields and lastActiveAt', async () => {
        const oldTime = new Date(Date.now() - 10000).toISOString() // 10 seconds ago
        const session = createTestEchoSession({
          id: 'session-1',
          currentTime: 10,
          playbackRate: 1,
          volume: 1,
          lastActiveAt: oldTime,
          updatedAt: oldTime,
        })
        echoSessionData.set(session.id, session)
        const originalLastActiveAt = session.lastActiveAt

        await updateEchoSessionProgress(session.id, {
          currentTime: 30,
          playbackRate: 1.5,
        })

        const updated = echoSessionData.get(session.id)
        expect(updated?.currentTime).toBe(30)
        expect(updated?.playbackRate).toBe(1.5)
        expect(updated?.volume).toBe(1) // Unchanged
        expect(new Date(updated!.lastActiveAt).getTime()).toBeGreaterThan(
          new Date(originalLastActiveAt).getTime()
        )
        expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
          new Date(session.updatedAt).getTime()
        )
      })

      it('should update echo region times', async () => {
        const session = createTestEchoSession({ id: 'session-1' })
        echoSessionData.set(session.id, session)

        await updateEchoSessionProgress(session.id, {
          echoStartTime: 25,
          echoEndTime: 35,
        })

        const updated = echoSessionData.get(session.id)
        expect(updated?.echoStartTime).toBe(25)
        expect(updated?.echoEndTime).toBe(35)
      })

      it('should clear echo region when undefined', async () => {
        const session = createTestEchoSession({
          id: 'session-1',
          echoStartTime: 25,
          echoEndTime: 35,
        })
        echoSessionData.set(session.id, session)

        await updateEchoSessionProgress(session.id, {
          echoStartTime: undefined,
          echoEndTime: undefined,
        })

        const updated = echoSessionData.get(session.id)
        expect(updated?.echoStartTime).toBeUndefined()
        expect(updated?.echoEndTime).toBeUndefined()
      })
    })

    describe('completeEchoSession', () => {
      it('should mark session as completed', async () => {
        const oldTime = new Date(Date.now() - 10000).toISOString() // 10 seconds ago
        const session = createTestEchoSession({
          id: 'session-1',
          lastActiveAt: oldTime,
          updatedAt: oldTime,
        })
        echoSessionData.set(session.id, session)

        await completeEchoSession(session.id)

        const updated = echoSessionData.get(session.id)
        expect(updated?.completedAt).toBeTruthy()
        expect(new Date(updated!.lastActiveAt).getTime()).toBeGreaterThan(
          new Date(session.lastActiveAt).getTime()
        )
      })
    })

    describe('deleteEchoSession', () => {
      it('should delete session by ID', async () => {
        const session = createTestEchoSession({ id: 'session-1' })
        echoSessionData.set(session.id, session)

        await deleteEchoSession(session.id)

        expect(echoSessionData.has(session.id)).toBe(false)
        expect(db.echoSessions.delete).toHaveBeenCalledWith(session.id)
      })
    })
  })

  describe('Repository Object', () => {
    it('should export all methods through repository object', () => {
      expect(echoSessionRepository.getById).toBe(getEchoSessionById)
      expect(echoSessionRepository.getByTarget).toBe(getEchoSessionsByTarget)
      expect(echoSessionRepository.getLatestByTarget).toBe(getLatestEchoSessionByTarget)
      expect(echoSessionRepository.getActiveByTarget).toBe(getActiveEchoSessionByTarget)
      expect(echoSessionRepository.getOrCreateActive).toBe(getOrCreateActiveEchoSession)
      expect(echoSessionRepository.updateProgress).toBe(updateEchoSessionProgress)
      expect(echoSessionRepository.complete).toBe(completeEchoSession)
      expect(echoSessionRepository.delete).toBe(deleteEchoSession)
    })
  })
})

