/**
 * UnifiedChatLayout Component
 *
 * Renders the main layout structure for the unified chat interface.
 *
 * Single Responsibility: Layout rendering only
 */

import { NotesPanel } from '@/components/notes/NotesPanel'
import { UploadPanel } from '@/components/policy/UploadPanel'
import type { MissingField as MissingFieldInfo } from '@/components/sidebar/MissingFields'
import { Sidebar } from '@/components/sidebar/Sidebar'
import type { IntakeResult, PolicyAnalysisResult, PolicySummary, UserProfile } from '@repo/shared'

interface UnifiedChatLayoutProps {
  mode: 'intake' | 'policy'
  isActive: boolean
  resetKey: number
  profile: UserProfile
  missingFields: MissingFieldInfo[]
  capturedCount: number
  totalRequired: number
  latestIntakeResult: IntakeResult | null
  policySummary?: PolicySummary
  policyAnalysisResult?: PolicyAnalysisResult
  isAnalyzing: boolean
  inferredFields: Partial<UserProfile>
  inferenceReasons: Record<string, string>
  inferenceConfidence: Record<string, number>
  editorRef: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>
  uploadPanelFileInputRef: React.MutableRefObject<HTMLInputElement | null>
  uploadPanelEditorRef: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>
  onPolicyExtracted: (summary: PolicySummary) => void
  onContentChange: (content: string) => void
  onFieldExtracted: (fields: Record<string, string | number | boolean>) => void
  onFieldRemoved: (fieldName: string) => void
  onActionCommand: (command: string) => void
  onCommandError: (command: string) => void
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
  onDismissInference: (fieldName: string) => void
  onEditInference: (fieldName: string, value: unknown) => void
  onConvertToKnown: (fieldName: string, value: unknown) => void
}

export function UnifiedChatLayout({
  mode,
  isActive,
  resetKey,
  profile,
  missingFields,
  capturedCount,
  totalRequired,
  latestIntakeResult,
  policySummary,
  policyAnalysisResult,
  isAnalyzing,
  inferredFields,
  inferenceReasons,
  inferenceConfidence,
  editorRef,
  uploadPanelFileInputRef,
  uploadPanelEditorRef,
  onPolicyExtracted,
  onContentChange,
  onFieldExtracted,
  onFieldRemoved,
  onActionCommand,
  onCommandError,
  onFieldClick,
  onDismissInference,
  onEditInference,
  onConvertToKnown,
}: UnifiedChatLayoutProps) {
  return (
    <div className="flex h-full flex-col pt-14">
      <div
        className={`layout-transition grid flex-1 overflow-hidden ${
          isActive ? 'grid-cols-[70%_30%]' : 'grid-cols-[50%_50%]'
        }`}
      >
        {/* Left: PDF Drop Area (hidden when active) */}
        <div
          className={`layout-transition h-full overflow-y-auto border-r border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 ${
            isActive ? 'hidden' : 'block'
          }`}
        >
          <UploadPanel
            onPolicyExtracted={onPolicyExtracted}
            fileInputRef={uploadPanelFileInputRef}
            editorRef={uploadPanelEditorRef}
          />
        </div>

        {/* Center/Left: Notes + Compliance (expands when active) */}
        <div
          className={`layout-transition flex flex-col border-r border-gray-300 dark:border-gray-700 ${
            isActive ? 'col-span-1' : 'col-span-1'
          }`}
        >
          <div className="flex-1 overflow-hidden">
            <NotesPanel
              key={resetKey}
              mode={mode}
              onFieldExtracted={onFieldExtracted}
              onFieldRemoved={onFieldRemoved}
              onContentChange={onContentChange}
              onActionCommand={onActionCommand}
              onCommandError={onCommandError}
              editorRef={editorRef}
              autoFocus={!isActive}
              inferredFields={inferredFields}
              inferenceReasons={inferenceReasons}
              confidence={inferenceConfidence}
              onDismissInference={onDismissInference}
              onEditInference={onEditInference}
              onConvertToKnown={onConvertToKnown}
              profile={profile}
            />
          </div>
        </div>

        {/* Right: Sidebar (hidden when not active) */}
        <div className={`layout-transition overflow-y-auto ${isActive ? 'block' : 'hidden'}`}>
          <Sidebar
            mode={mode}
            profile={profile}
            missingFields={missingFields}
            capturedCount={capturedCount}
            totalRequired={totalRequired}
            onFieldClick={onFieldClick}
            policySummary={policySummary}
            confidence={latestIntakeResult?.confidence}
            policyAnalysisResult={policyAnalysisResult}
            isAnalyzing={isAnalyzing}
            inferredFields={inferredFields}
            inferenceReasons={inferenceReasons}
            onDismiss={onDismissInference}
          />
        </div>
      </div>
    </div>
  )
}
