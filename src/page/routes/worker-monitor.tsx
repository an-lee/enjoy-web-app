import { createFileRoute } from '@tanstack/react-router'
import { WorkerMonitorPanel } from '@/page/components/worker-monitor/worker-monitor-panel'

export const Route = createFileRoute('/worker-monitor')({
  component: WorkerMonitorPage,
})

function WorkerMonitorPage() {
  return (
    <div className="container mx-auto max-w-7xl py-8">
      <WorkerMonitorPanel />
    </div>
  )
}
