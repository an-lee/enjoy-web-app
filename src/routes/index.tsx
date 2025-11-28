import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center px-6">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Welcome
        </h1>
        <p className="text-xl text-gray-300">
          Your application is ready to go!
        </p>
      </div>
    </div>
  )
}
