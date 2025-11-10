import { UnifiedChatInterface } from '@/components/intake/UnifiedChatInterface'
import { UploadPanel } from '@/components/policy/UploadPanel'

export function HomeScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-900 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 dark:text-white">
      <div className="panel-transition grid h-screen grid-cols-[70%_30%]">
        {/* Left/Center: Unified Chat Interface (includes sidebar internally) */}
        <div className="flex h-full flex-col border-r border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <UnifiedChatInterface mode="intake" />
        </div>
        {/* Right: Policy Upload Sidebar */}
        <div className="h-full overflow-y-auto bg-gray-100 dark:bg-gray-800">
          <UploadPanel />
        </div>
      </div>
    </div>
  )
}
