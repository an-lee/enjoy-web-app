/**
 * RecordingAssessmentButton Component
 *
 * Handles pronunciation assessment for a recording.
 * Displays assessment button with score and manages assessment dialog.
 */

import { useState, useCallback } from 'react'
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

  // Handle assessment
  const handleAssessment = useCallback(async () => {
    // If assessment exists, show dialog
    if (recording.assessment) {
      setShowAssessmentDialog(true)
      return
    }

    // If no blob, can't assess
    if (!recording.blob) {
      toast.error(t('player.transcript.assessment.noRecording'))
      return
    }

    // Validate blob size
    if (recording.blob.size < 100) {
      log.warn('Recording blob is too small', { size: recording.blob.size })
      toast.error(t('player.transcript.assessment.noRecording'))
      return
    }

    // Start assessment
    setIsAssessing(true)
    try {
      const config = getAIServiceConfig('assessment')
      log.debug('Starting assessment', {
        blobSize: recording.blob.size,
        blobType: recording.blob.type,
        duration: recording.duration,
        language: recording.language,
        referenceText: recording.referenceText,
        referenceTextLength: recording.referenceText?.length || 0,
      })
      const result = await assessmentService.assess({
        audioBlob: recording.blob,
        referenceText: recording.referenceText,
        language: recording.language,
        config,
        durationMs: recording.duration, // duration in milliseconds
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Assessment failed')
      }

      // Update recording with assessment result
      const assessmentResult = result.data
      const fullResult = assessmentResult.fullResult
      const pronunciationScore = assessmentResult.overallScore

      await updateRecording(recording.id, {
        assessment: fullResult,
        pronunciationScore,
      })

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries({
        queryKey: recordingQueryKeys.byTarget(recording.targetType, recording.targetId),
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
  }, [recording, queryClient, t])

  // Get score for display
  const score = recording.pronunciationScore ?? recording.assessment?.NBest?.[0]?.PronunciationAssessment?.PronScore

  // Get score level config for styling
  const scoreConfig = score !== undefined ? getScoreLevelConfig(score) : null

  return (
    <>
      {/* Assessment Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAssessment}
        disabled={isAssessing || !recording.blob}
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
      {recording.assessment && (
        <AssessmentResultDialog
          open={showAssessmentDialog}
          onOpenChange={setShowAssessmentDialog}
          assessment={recording.assessment}
        />
      )}
    </>
  )
}

