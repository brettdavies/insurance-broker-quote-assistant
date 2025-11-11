/**
 * Unified Chat Interface Component
 *
 * Combines Notes Panel, Chat History, Sidebar, and Compliance Panel
 * into a single integrated interface for Story 1.4.
 */

import { CompliancePanel } from '@/components/layout/CompliancePanel'
import { ChatHistory, type ChatMessage } from '@/components/notes/ChatHistory'
import { NotesPanel } from '@/components/notes/NotesPanel'
import { UploadPanel } from '@/components/policy/UploadPanel'
import { FieldModal } from '@/components/shortcuts/FieldModal'
import { HelpModal } from '@/components/shortcuts/HelpModal'
import type { MissingField } from '@/components/sidebar/MissingFields'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useToast } from '@/components/ui/use-toast'
import { useIntake } from '@/hooks/useIntake'
import type { ActionCommand, FieldCommand } from '@/hooks/useSlashCommands'
import { extractFields, parseKeyValueSyntax } from '@/lib/key-value-parser'
import type { UserProfile } from '@repo/shared'
import { useCallback, useRef, useState } from 'react'

interface UnifiedChatInterfaceProps {
  mode?: 'intake' | 'policy'
  isActive?: boolean
  onContentChange?: (content: string) => void
  onActionCommand?: (command: ActionCommand) => void
  onCommandError?: (command: string) => void
  editorRef?: React.MutableRefObject<{ focus: () => void; clear: () => void } | null>
}

export function UnifiedChatInterface({
  mode = 'intake',
  isActive = false,
  onContentChange,
  onActionCommand,
  onCommandError,
  editorRef: externalEditorRef,
}: UnifiedChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [profile, setProfile] = useState<UserProfile>({})
  const [missingFields, setMissingFields] = useState<MissingField[]>([])
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<{
    key: string
    value?: string | number | boolean
  } | null>(null)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const internalEditorRef = useRef<{ focus: () => void; clear: () => void } | null>(null)
  const editorRef = externalEditorRef || internalEditorRef

  const { toast } = useToast()
  const intakeMutation = useIntake()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle message submission
  const handleMessageSubmit = useCallback(
    async (messageText: string) => {
      // Add message to history immediately (optimistic)
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        text: messageText,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])

      // Extract key-value pairs immediately (optimistic UI)
      const parsed = parseKeyValueSyntax(messageText)
      const extractedFields = extractFields(parsed)

      if (Object.keys(extractedFields).length > 0) {
        // Update profile optimistically
        setProfile((prev) => ({ ...prev, ...extractedFields }))

        // Show toast for each captured field
        for (const [key, value] of Object.entries(extractedFields)) {
          toast({
            title: 'Field captured',
            description: `${key}: ${value}`,
            duration: 5000,
          })
        }
      }

      // Debounce LLM extraction (500ms)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      const timer = setTimeout(async () => {
        try {
          const result = await intakeMutation.mutateAsync({
            message: messageText,
            conversationHistory: messages.map((m) => ({
              role: 'user',
              content: m.text,
            })),
          })

          // Reconcile with backend response
          setProfile((prev) => ({ ...prev, ...result.profile }))
          setMissingFields(result.missingFields as MissingField[])
        } catch (error) {
          console.error('Failed to extract fields:', error)
          toast({
            title: 'Extraction error',
            description: 'Failed to extract fields. Please try again.',
            variant: 'destructive',
            duration: 5000,
          })
        }
      }, 500)

      debounceTimerRef.current = timer
    },
    [messages, intakeMutation, toast]
  )

  // Handle field click (from sidebar)
  const handleFieldClick = useCallback(
    (fieldKey: string, currentValue?: string | number | boolean) => {
      // Map fieldKey to FieldCommand
      const fieldKeyToCommand: Record<string, FieldCommand> = {
        name: 'name',
        email: 'email',
        phone: 'phone',
        state: 'state',
        zip: 'zip',
        productLine: 'productLine',
        age: 'age',
        household: 'household',
        kids: 'kids',
        dependents: 'dependents',
        vehicles: 'vehicles',
        garage: 'garage',
        vins: 'vins',
        drivers: 'drivers',
        drivingRecords: 'drivingRecords',
        cleanRecord: 'cleanRecord',
        ownsHome: 'ownsHome',
        propertyType: 'propertyType',
        constructionYear: 'constructionYear',
        roofType: 'roofType',
        squareFeet: 'squareFeet',
        existingPolicies: 'existingPolicies',
        currentPremium: 'currentPremium',
        deductibles: 'deductibles',
        limits: 'limits',
      }

      const command = fieldKeyToCommand[fieldKey]
      if (command) {
        setCurrentField({ key: fieldKey, value: currentValue })
        setFieldModalOpen(true)
      }
    },
    []
  )

  // Handle field modal submit
  const handleFieldModalSubmit = useCallback(
    (value: string) => {
      if (currentField) {
        // Update profile
        const updatedProfile = { ...profile }
        const numValue = Number.parseInt(value, 10)
        if (!Number.isNaN(numValue)) {
          updatedProfile[currentField.key as keyof UserProfile] = numValue as never
        } else if (value === 'true' || value === 'false') {
          updatedProfile[currentField.key as keyof UserProfile] = (value === 'true') as never
        } else {
          updatedProfile[currentField.key as keyof UserProfile] = value as never
        }
        setProfile(updatedProfile)

        // Show toast
        toast({
          title: 'Field captured',
          description: `${currentField.key}: ${value}`,
          duration: 5000,
        })

        // Update missing fields (remove if was missing)
        setMissingFields((prev) => prev.filter((f) => f.fieldKey !== currentField.key))
      }
      setFieldModalOpen(false)
      setCurrentField(null)
    },
    [currentField, profile, toast]
  )

  // Calculate captured count
  const capturedCount = Object.keys(profile).filter((key) => {
    const value = profile[key as keyof UserProfile]
    return value !== undefined && value !== null && value !== ''
  }).length

  const totalRequired = capturedCount + missingFields.length

  // Map currentField.key to FieldCommand for modal
  const fieldCommandMap: Record<string, FieldCommand> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    state: 'state',
    zip: 'zip',
    productLine: 'productLine',
    age: 'age',
    household: 'household',
    kids: 'kids',
    dependents: 'dependents',
    vehicles: 'vehicles',
    garage: 'garage',
    vins: 'vins',
    drivers: 'drivers',
    drivingRecords: 'drivingRecords',
    cleanRecord: 'cleanRecord',
    ownsHome: 'ownsHome',
    propertyType: 'propertyType',
    constructionYear: 'constructionYear',
    roofType: 'roofType',
    squareFeet: 'squareFeet',
    existingPolicies: 'existingPolicies',
    currentPremium: 'currentPremium',
    deductibles: 'deductibles',
    limits: 'limits',
  }

  const fieldCommand = currentField ? (fieldCommandMap[currentField.key] ?? null) : null

  // Handle action commands (reset, help, etc.)
  const handleActionCommand = useCallback(
    (command: ActionCommand) => {
      if (command === 'reset') {
        // Clear all state
        setMessages([])
        setProfile({})
        setMissingFields([])
        setCurrentField(null)
        setFieldModalOpen(false)
        setHelpModalOpen(false)

        // Clear any pending debounce timers
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }

        // Clear editor content
        editorRef.current?.clear()

        // Refocus editor after reset
        setTimeout(() => {
          editorRef.current?.focus()
        }, 100)

        toast({
          title: 'Session reset',
          description: 'All data has been cleared.',
          duration: 3000,
        })
      } else if (command === 'help') {
        setHelpModalOpen(true)
      }
    },
    [toast, editorRef]
  )

  // Handle command errors (invalid commands)
  const handleCommandError = useCallback(
    (command: string) => {
      toast({
        title: 'Invalid command',
        description: `Command "/${command}" not found. Type /help for available commands.`,
        variant: 'destructive',
        duration: 3000,
      })
    },
    [toast]
  )

  // Merge parent callbacks with local handlers
  const handleMessageSubmitMerged = useCallback(
    (messageText: string) => {
      handleMessageSubmit(messageText)
    },
    [handleMessageSubmit]
  )

  const handleActionCommandMerged = useCallback(
    (command: ActionCommand) => {
      handleActionCommand(command)
      onActionCommand?.(command)
    },
    [handleActionCommand, onActionCommand]
  )

  const handleCommandErrorMerged = useCallback(
    (command: string) => {
      handleCommandError(command)
      onCommandError?.(command)
    },
    [handleCommandError, onCommandError]
  )

  return (
    <>
      <div className="flex h-full flex-col">
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
            <UploadPanel />
          </div>

          {/* Center/Left: Chat History + Notes + Compliance (expands when active) */}
          <div
            className={`layout-transition flex flex-col border-r border-gray-300 dark:border-gray-700 ${
              isActive ? 'col-span-1' : 'col-span-1'
            }`}
          >
            {/* Chat History (hidden when not active) */}
            <div className={`flex-1 overflow-hidden ${isActive ? 'block' : 'hidden'}`}>
              <ChatHistory messages={messages} />
            </div>

            {/* Notes Input (always visible) */}
            <div className="border-t border-gray-300 dark:border-gray-700">
              <NotesPanel
                mode={mode}
                onMessageSubmit={handleMessageSubmitMerged}
                onContentChange={onContentChange}
                onActionCommand={handleActionCommandMerged}
                onCommandError={handleCommandErrorMerged}
                editorRef={editorRef}
                autoFocus={!isActive}
              />
            </div>

            {/* Compliance Panel (hidden when not active) */}
            <div className={`border-t p-4 dark:border-gray-700 ${isActive ? 'block' : 'hidden'}`}>
              <CompliancePanel mode={mode} profile={profile} />
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
              onFieldClick={handleFieldClick}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <FieldModal
        open={fieldModalOpen}
        onOpenChange={setFieldModalOpen}
        field={fieldCommand}
        onSubmit={handleFieldModalSubmit}
        initialValue={currentField?.value?.toString()}
      />

      <HelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} />
    </>
  )
}
