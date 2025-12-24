/**
 * RecordingAssessmentButton Component
 *
 * Handles pronunciation assessment for a recording.
 * Displays assessment button with score and manages assessment dialog.
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@iconify/react'
import { Button } from '@/page/components/ui/button'
import { toast } from 'sonner'
import { updateRecording } from '@/page/db'
import { recordingQueryKeys } from '@/page/hooks/queries'
import { cn, createLogger } from '@/shared/lib/utils'
import { assessmentService } from '@/page/ai/services/assessment'
import { getAIServiceConfig } from '@/page/ai/core/config'
import { AssessmentResultDialog } from './assessment-result-dialog'
import { getScoreLevelConfig } from './assessment-utils'
import type { Recording } from '@/page/types/db'

const log = createLogger({ name: 'RecordingAssessmentButton' })

interface RecordingAssessmentButtonProps {
  /** The recording to assess */
  recording: Recording
}

export function RecordingAssessmentButton({ recording }: RecordingAssessmentButtonProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isAssessing, setIsAssessing] = useState(false)
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false)
  // Local state to immediately reflect assessment updates
  const [localRecording, setLocalRecording] = useState<Recording>(recording)

  // Update local recording when prop changes
  useEffect(() => {
    setLocalRecording(recording)
  }, [recording])

  // Handle assessment
  const handleAssessment = useCallback(async () => {
    // If assessment exists, show dialog
    if (localRecording.assessment) {
      setShowAssessmentDialog(true)
      return
    }

    // If no blob, can't assess
    if (!localRecording.blob) {
      toast.error(t('player.transcript.assessment.noRecording'))
      return
    }

    // Validate blob size
    if (localRecording.blob.size < 100) {
      log.warn('Recording blob is too small', { size: localRecording.blob.size })
      toast.error(t('player.transcript.assessment.noRecording'))
      return
    }

    // Start assessment
    setIsAssessing(true)
    try {
      const config = getAIServiceConfig('assessment')
      log.debug('Starting assessment', {
        blobSize: localRecording.blob.size,
        blobType: localRecording.blob.type,
        duration: localRecording.duration,
        language: localRecording.language,
        referenceText: localRecording.referenceText,
        referenceTextLength: localRecording.referenceText?.length || 0,
      })
      const result = await assessmentService.assess({
        audioBlob: localRecording.blob,
        referenceText: localRecording.referenceText,
        language: localRecording.language,
        config,
        durationMs: localRecording.duration, // duration in milliseconds
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Assessment failed')
      }

      // Update recording with assessment result
      const assessmentResult = result.data
      const fullResult = assessmentResult.fullResult
      const pronunciationScore = assessmentResult.overallScore

      // Update database
      await updateRecording(localRecording.id, {
        assessment: fullResult,
        pronunciationScore,
      })

      // Immediately update local state to show score
      const updatedRecording: Recording = {
        ...localRecording,
        assessment: fullResult,
        pronunciationScore,
      }
      setLocalRecording(updatedRecording)

      // Update query cache for immediate UI updates across all components
      const byTargetKey = recordingQueryKeys.byTarget(
        localRecording.targetType,
        localRecording.targetId
      )
      queryClient.setQueryData<Recording[]>(byTargetKey, (oldData) => {
        if (!oldData) return oldData
        return oldData.map((r) => (r.id === localRecording.id ? updatedRecording : r))
      })

      // Also update byEchoRegion cache if applicable
      const startTime = Math.round(localRecording.referenceStart)
      const endTime = Math.round(localRecording.referenceStart + localRecording.referenceDuration)
      const byEchoRegionKey = recordingQueryKeys.byEchoRegion(
        localRecording.targetType,
        localRecording.targetId,
        localRecording.language,
        startTime,
        endTime
      )
      queryClient.setQueryData<Recording[]>(byEchoRegionKey, (oldData) => {
        if (!oldData) return oldData
        return oldData.map((r) => (r.id === localRecording.id ? updatedRecording : r))
      })

      // Invalidate queries to ensure consistency (runs in background)
      queryClient.invalidateQueries({
        queryKey: byTargetKey,
      })

      // Show dialog with results
      setShowAssessmentDialog(true)
      toast.success(t('player.transcript.assessment.success'))
    } catch (error) {
      log.error('Failed to assess pronunciation:', error)
      toast.error(t('player.transcript.assessment.error'))
    } finally {
      setIsAssessing(false)
    }
  }, [localRecording, queryClient, t])

  // Get score for display (use localRecording for immediate updates)
  const score =
    localRecording.pronunciationScore ??
    localRecording.assessment?.NBest?.[0]?.PronunciationAssessment?.PronScore

  // Get score level config for styling
  const scoreConfig = score !== undefined ? getScoreLevelConfig(score) : null

  return (
    <>
      {/* Assessment Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAssessment}
        disabled={isAssessing || !localRecording.blob}
        className={cn(
          'size-8 rounded-full shrink-0 cursor-pointer',
          scoreConfig && scoreConfig.badgeClassName
        )}
      >
        {isAssessing ? (
          <>
            <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
          </>
        ) : score !== undefined ? (
          <span className="text-xs font-semibold">{Math.round(score)}</span>
        ) : (
          <>
            <Icon icon="lucide:sparkles" className="size-4" />
          </>
        )}
      </Button>

      {/* Assessment Result Dialog */}
      {localRecording.assessment && (
        <AssessmentResultDialog
          open={showAssessmentDialog}
          onOpenChange={setShowAssessmentDialog}
          assessment={localRecording.assessment}
        />
      )}
    </>
  )
}

