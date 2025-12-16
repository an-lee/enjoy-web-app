/**
 * Sync Page Component
 * Displays sync status and provides sync controls
 * Separated into Upload and Download sections
 */

import { SyncStatusCard } from './sync-status-card'
import { UploadStatusCard } from './upload-status-card'
import { DownloadStatusCard } from './download-status-card'
import { UploadActionsCard } from './upload-actions-card'
import { DownloadActionsCard } from './download-actions-card'

export function SyncPage() {
  return (
    <div className="space-y-6">
      {/* Overall Sync Status */}
      <SyncStatusCard />

      {/* Upload Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upload</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <UploadStatusCard />
          <UploadActionsCard />
        </div>
      </div>

      {/* Download Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Download</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <DownloadStatusCard />
          <DownloadActionsCard />
        </div>
      </div>
    </div>
  )
}

