/**
 * Unified Chat Interface Component
 *
 * Combines Notes Panel, Chat History, Sidebar, and Compliance Panel
 * into a single integrated interface for Story 1.4.
 */

import { CompliancePanel } from '@/components/layout/CompliancePanel'
import { NotesPanel } from '@/components/notes/NotesPanel'
import { UploadPanel } from '@/components/policy/UploadPanel'
import { FieldModal } from '@/components/shortcuts/FieldModal'
import { HelpModal } from '@/components/shortcuts/HelpModal'
import type { MissingField } from '@/components/sidebar/MissingFields'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useToast } from '@/components/ui/use-toast'
import { FIELD_METADATA, FIELD_SHORTCUTS } from '@/config/shortcuts'
import { useIntake } from '@/hooks/useIntake'
import type { ActionCommand, FieldCommand } from '@/hooks/useSlashCommands'
import { calculateMissingFields } from '@/lib/missing-fields'
import {
  generatePrefillFilename,
  getPrefillPacket,
  handleCopy,
  handleExport,
} from '@/lib/prefill-utils'
import type { IntakeResult, UserProfile } from '@repo/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  const [profile, setProfile] = useState<UserProfile>({})
  const profileRef = useRef<UserProfile>({})
  const [missingFields, setMissingFields] = useState<MissingField[]>([])
  const [disclaimers, setDisclaimers] = useState<string[]>([])
  const [latestIntakeResult, setLatestIntakeResult] = useState<IntakeResult | null>(null)
  const hasBackendMissingFields = useRef(false)
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
  const editorContentRef = useRef<string>('')

  // Update profile ref when profile changes
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // Calculate missing fields from current profile state
  // This ensures missing fields are always displayed even before intake endpoint is called
  useEffect(() => {
    // Only calculate frontend missing fields if we don't have backend ones yet
    if (!hasBackendMissingFields.current) {
      const calculated = calculateMissingFields(profile)
      // Convert to MissingField format
      const fieldMetadata = calculated.map((field) => {
        // Get field display name from FIELD_METADATA
        const metadata = FIELD_METADATA[field.fieldKey as keyof typeof FIELD_METADATA]
        const displayName = metadata?.label || field.fieldKey
        return {
          name: displayName,
          priority: field.priority,
          fieldKey: field.fieldKey,
        }
      })
      setMissingFields(fieldMetadata)
    }
  }, [profile])

  // Handle field extraction from pills
  const handleFieldExtracted = useCallback(
    (extractedFields: Record<string, string | number>) => {
      if (Object.keys(extractedFields).length === 0) return

      // Track fields that actually changed before updating state
      const currentProfile = profileRef.current
      const changedFields: Array<[string, string | number]> = []
      for (const [key, value] of Object.entries(extractedFields)) {
        if (currentProfile[key as keyof UserProfile] !== value) {
          changedFields.push([key, value])
        }
      }

      // Update profile
      setProfile((prev) => {
        const updated = { ...prev, ...extractedFields }
        profileRef.current = updated
        return updated
      })

      // Show toast for changed fields (outside of render phase)
      // Use setTimeout to ensure this runs after the state update completes
      if (changedFields.length > 0) {
        setTimeout(() => {
          for (const [key, value] of changedFields) {
            toast({
              title: 'Field captured',
              description: `${key}: ${value}`,
              duration: 3000,
            })
          }
        }, 0)
      }

      // Debounce LLM extraction (500ms) using current editor content
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      const timer = setTimeout(async () => {
        const currentContent = editorContentRef.current
        if (!currentContent.trim()) return

        try {
          const result = await intakeMutation.mutateAsync({
            message: currentContent,
            conversationHistory: [], // No conversation history - AI extraction happens silently
          })

          // Store latest intake result for prefill packet access
          setLatestIntakeResult(result)

          // Reconcile with backend response
          setProfile((prev) => ({ ...prev, ...result.profile }))
          // Convert string array to MissingField objects
          // Format: "[CRITICAL] fieldName", "[IMPORTANT] fieldName", "[OPTIONAL] fieldName"
          hasBackendMissingFields.current = true
          setMissingFields(
            result.missingFields.map((fieldStr) => {
              // Parse priority and field name from string like "[CRITICAL] state"
              const priorityMatch = fieldStr.match(/^\[(CRITICAL|IMPORTANT|OPTIONAL)\]\s*(.+)$/)
              if (priorityMatch?.[2]) {
                const priorityStr = priorityMatch[1]
                const fieldName = priorityMatch[2]
                const priority =
                  priorityStr === 'CRITICAL'
                    ? 'critical'
                    : priorityStr === 'IMPORTANT'
                      ? 'important'
                      : 'optional'
                // Extract field key (remove priority prefix if present)
                const fieldKey = fieldName.trim()
                // Get field display name from FIELD_METADATA
                const metadata = FIELD_METADATA[fieldKey as keyof typeof FIELD_METADATA]
                const displayName = metadata?.label || fieldKey
                return {
                  name: displayName,
                  priority: priority as 'critical' | 'important' | 'optional',
                  fieldKey,
                }
              }
              // Fallback: treat as critical if format doesn't match
              return {
                name: fieldStr,
                priority: 'critical' as const,
                fieldKey: fieldStr,
              }
            })
          )
          // Update disclaimers from backend compliance filter
          setDisclaimers(result.disclaimers || [])
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
    [intakeMutation, toast]
  )

  // Handle content change to track editor content for LLM extraction
  const handleContentChange = useCallback(
    (content: string) => {
      editorContentRef.current = content
      onContentChange?.(content)
    },
    [onContentChange]
  )

  // Handle field click (from sidebar)
  const handleFieldClick = useCallback(
    (fieldKey: string, currentValue?: string | number | boolean) => {
      // Commands match UserProfile field names directly, so fieldKey IS the command
      // Verify it's a valid FieldCommand by checking if it exists in FIELD_SHORTCUTS values
      const isValidFieldCommand = Object.values(FIELD_SHORTCUTS).includes(fieldKey as FieldCommand)
      if (isValidFieldCommand) {
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

  // Commands match UserProfile field names directly, so currentField.key IS the command
  // Verify it's a valid FieldCommand
  const fieldCommand = currentField
    ? Object.values(FIELD_SHORTCUTS).includes(currentField.key as FieldCommand)
      ? (currentField.key as FieldCommand)
      : null
    : null

  // Handle export command
  const handleExportCommand = useCallback(async () => {
    try {
      const prefillPacket = await getPrefillPacket(latestIntakeResult, profile)
      handleExport(prefillPacket)
      toast({
        title: 'Export successful',
        description: `Downloaded ${generatePrefillFilename(prefillPacket)}`,
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export prefill packet',
        variant: 'destructive',
        duration: 5000,
      })
    }
  }, [latestIntakeResult, profile, toast])

  // Handle copy command
  const handleCopyCommand = useCallback(async () => {
    try {
      console.log('Copy command: Starting prefill packet fetch...')
      const prefillPacket = await getPrefillPacket(latestIntakeResult, profile)
      console.log('Copy command: Prefill packet received:', prefillPacket)
      await handleCopy(prefillPacket)
      console.log('Copy command: Success - showing success toast')
      toast({
        title: 'Copied to clipboard',
        description: 'Prefill packet JSON copied to clipboard',
        duration: 3000,
      })
    } catch (error) {
      console.error('Copy command error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy to clipboard'
      console.log('Copy command: Showing error toast with message:', errorMessage)
      const toastResult = toast({
        title: 'Copy failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      })
      console.log('Copy command: Toast result:', toastResult)
    }
  }, [latestIntakeResult, profile, toast])

  // Handle action commands (reset, help, export, copy, etc.)
  const handleActionCommand = useCallback(
    (command: ActionCommand) => {
      if (command === 'reset') {
        // Clear all state
        setProfile({})
        setMissingFields([])
        setLatestIntakeResult(null)
        hasBackendMissingFields.current = false
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
      } else if (command === 'export') {
        handleExportCommand()
      } else if (command === 'copy') {
        handleCopyCommand()
      }
    },
    [toast, editorRef, handleExportCommand, handleCopyCommand]
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

          {/* Center/Left: Notes + Compliance (expands when active) */}
          <div
            className={`layout-transition flex flex-col border-r border-gray-300 dark:border-gray-700 ${
              isActive ? 'col-span-1' : 'col-span-1'
            }`}
          >
            {/* Notes Input (always visible, at top) */}
            <div className="flex-1 overflow-hidden">
              <NotesPanel
                mode={mode}
                onFieldExtracted={handleFieldExtracted}
                onContentChange={handleContentChange}
                onActionCommand={handleActionCommandMerged}
                onCommandError={handleCommandErrorMerged}
                editorRef={editorRef}
                autoFocus={!isActive}
              />
            </div>

            {/* Compliance Panel (directly below notes input, hidden when not active) */}
            <div className={`border-t p-4 dark:border-gray-700 ${isActive ? 'block' : 'hidden'}`}>
              <CompliancePanel mode={mode} disclaimers={disclaimers} />
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
              onExport={handleExportCommand}
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
