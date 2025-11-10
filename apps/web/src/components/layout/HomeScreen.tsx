import { ChatPanel } from '@/components/intake/ChatPanel'
import { UploadPanel } from '@/components/policy/UploadPanel'

export function HomeScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-900 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 dark:text-white">
      <div className="grid h-screen grid-cols-[65%_35%]">
        {/* Left/Center: Chat Panel */}
        <div className="border-r border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <ChatPanel />
        </div>
        {/* Right: Policy Upload Sidebar */}
        <div className="bg-gray-100 dark:bg-gray-800">
          <UploadPanel />
        </div>
      </div>
    </div>
  )
}
