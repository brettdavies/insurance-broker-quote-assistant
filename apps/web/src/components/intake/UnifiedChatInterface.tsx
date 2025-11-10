/**
 * Unified Chat Interface Component
 *
 * Combines Notes Panel, Chat History, Sidebar, and Compliance Panel
 * into a single integrated interface for Story 1.4.
 */

import { CompliancePanel } from '@/components/layout/CompliancePanel'
import { ChatHistory, type ChatMessage } from '@/components/notes/ChatHistory'
import { NotesPanel } from '@/components/notes/NotesPanel'
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
}

export function UnifiedChatInterface({ mode = 'intake' }: UnifiedChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [profile, setProfile] = useState<UserProfile>({})
  const [missingFields, setMissingFields] = useState<MissingField[]>([])
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<{
    key: string
    value?: string | number | boolean
  } | null>(null)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const editorRef = useRef<{ focus: () => void; clear: () => void } | null>(null)

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
    [toast]
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

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="grid flex-1 grid-cols-[70%_30%] overflow-hidden">
          {/* Left: Chat History + Notes + Compliance */}
          <div className="flex flex-col border-r border-gray-300 dark:border-gray-700">
            {/* Chat History */}
            <div className="flex-1 overflow-hidden">
              <ChatHistory messages={messages} />
            </div>

            {/* Notes Input */}
            <div className="border-t border-gray-300 dark:border-gray-700">
              <NotesPanel
                mode={mode}
                onMessageSubmit={handleMessageSubmit}
                onActionCommand={handleActionCommand}
                onCommandError={handleCommandError}
                editorRef={editorRef}
              />
            </div>

            {/* Compliance Panel */}
            <div className="border-t border-gray-300 p-4 dark:border-gray-700">
              <CompliancePanel mode={mode} profile={profile} />
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="overflow-y-auto">
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
