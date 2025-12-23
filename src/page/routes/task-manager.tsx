import { createFileRoute } from '@tanstack/react-router'
import { TaskManagerPanel } from '@/page/components/task-manager/task-manager-panel'

export const Route = createFileRoute('/task-manager')({
  component: TaskManagerPage,
})

function TaskManagerPage() {
  return (
    <div className="container mx-auto max-w-7xl py-8">
      <TaskManagerPanel />
    </div>
  )
}
