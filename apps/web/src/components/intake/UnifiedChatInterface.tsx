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
import type { MissingField as MissingFieldInfo } from '@/components/sidebar/MissingFields'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useToast } from '@/components/ui/use-toast'
import { COMMAND_TO_KEY, FIELD_METADATA, FIELD_SHORTCUTS } from '@/config/shortcuts'
import { EXTRACTION_DEBOUNCE_MS } from '@/constants/debounce'
import { useIntake } from '@/hooks/useIntake'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePolicyAnalysis } from '@/hooks/usePolicyAnalysis'
import type { ActionCommand, FieldCommand } from '@/hooks/useSlashCommands'
import { useSuppressionManager } from '@/hooks/useSuppressionManager'
import { useUnifiedChatState } from '@/hooks/useUnifiedChatState'
import { copySavingsPitchToClipboard } from '@/lib/clipboard-utils'
import { exportSavingsPitch } from '@/lib/export-utils'
import { calculateMissingFields, convertMissingFieldsToInfo } from '@/lib/missing-fields'
import {
  generatePrefillFilename,
  getPrefillPacket,
  handleCopy,
  handleExport,
} from '@/lib/prefill-utils'
import type {
  IntakeResult,
  MissingField,
  PolicyAnalysisResult,
  PolicySummary,
  UserProfile,
} from '@repo/shared'
import { useCallback, useEffect, useRef } from 'react'

interface UnifiedChatInterfaceProps {
  mode?: 'intake' | 'policy'
  isActive?: boolean
  onContentChange?: (content: string) => void
  onActionCommand?: (command: ActionCommand) => void
  onCommandError?: (command: string) => void
  editorRef?: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>
}

export function UnifiedChatInterface({
  mode = 'intake',
  isActive = false,
  onContentChange,
  onActionCommand,
  onCommandError,
  editorRef: externalEditorRef,
}: UnifiedChatInterfaceProps) {
  const {
    state,
    profileRef,
    updateProfile,
    removeField,
    setMissingFields,
    setDisclaimers,
    setLatestIntakeResult,
    setPolicySummary,
    setPolicyAnalysisResult,
    setHasBackendMissingFields,
    setFieldModalOpen,
    setCurrentField,
    setHelpModalOpen,
    reset,
  } = useUnifiedChatState()

  const {
    profile,
    missingFields,
    disclaimers,
    latestIntakeResult,
    policySummary,
    policyAnalysisResult,
    hasBackendMissingFields,
    fieldModalOpen,
    currentField,
    helpModalOpen,
  } = state

  const policyAnalysisMutation = usePolicyAnalysis()
  const suppression = useSuppressionManager()
  const internalEditorRef = useRef<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>(null)
  const editorRef = externalEditorRef || internalEditorRef

  // Expose editor ref to window for evaluation harness
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Extend window with debug properties for evaluation harness
      interface WindowWithDebug extends Window {
        editorRef?: typeof editorRef
        profile?: typeof profile
      }
      const win = window as unknown as WindowWithDebug
      win.editorRef = editorRef
      win.profile = profile
    }
  }, [editorRef, profile])

  const { toast } = useToast()
  const intakeMutation = useIntake()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const editorContentRef = useRef<string>('')
  const uploadPanelFileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadPanelEditorRef = useRef<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>(null)

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onFocusPolicyUpload: () => {
      // Focus the upload panel's file input or editor
      if (uploadPanelFileInputRef.current) {
        uploadPanelFileInputRef.current.click() // Open file picker
      } else if (uploadPanelEditorRef.current) {
        uploadPanelEditorRef.current.focus() // Focus manual entry editor
      }
    },
  })

  // Profile ref is automatically kept in sync by useUnifiedChatState

  // Expose profile state on window for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __profileState?: UserProfile }).__profileState = profile
    }
  }, [profile])

  // Trigger policy analysis when policySummary is available in policy mode
  useEffect(() => {
    if (mode === 'policy' && policySummary && !policyAnalysisMutation.isPending) {
      // Only trigger if we don't already have a result or if policySummary changed
      policyAnalysisMutation.mutate(
        { policySummary },
        {
          onSuccess: (result) => {
            setPolicyAnalysisResult(result)
          },
          onError: (error) => {
            console.error('Policy analysis failed:', error)
            toast({
              title: 'Analysis failed',
              description: error instanceof Error ? error.message : 'Failed to analyze policy',
              variant: 'destructive',
              duration: 5000,
            })
          },
        }
      )
    }
  }, [mode, policySummary, policyAnalysisMutation, toast, setPolicyAnalysisResult])

  // Calculate missing fields from current profile state
  // This ensures missing fields are always displayed even before intake endpoint is called
  useEffect(() => {
    // Only calculate frontend missing fields if we don't have backend ones yet
    if (!hasBackendMissingFields) {
      // Get carrier/state from latest intake result if available
      const carrier = latestIntakeResult?.route?.primaryCarrier
      const state = profile.state || latestIntakeResult?.profile?.state
      const productType = profile.productType || latestIntakeResult?.profile?.productType

      const calculated = calculateMissingFields(
        profile,
        productType ?? undefined,
        state ?? undefined,
        carrier
      )
      // Convert to MissingField format for component
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
  }, [profile, latestIntakeResult, hasBackendMissingFields, setMissingFields])

  // Handle field removal when pill is deleted
  const handleFieldRemoved = useCallback(
    (fieldName: string) => {
      removeField(fieldName)

      // Show toast
      setTimeout(() => {
        toast({
          title: 'Field removed',
          description: `${fieldName} has been removed`,
          duration: 3000,
        })
      }, 0)
    },
    [toast, removeField]
  )

  // Handle field extraction from pills
  // biome-ignore lint/correctness/useExhaustiveDependencies: editorRef.current is a ref and doesn't need to be in deps
  const handleFieldExtracted = useCallback(
    (extractedFields: Record<string, string | number | boolean>) => {
      if (Object.keys(extractedFields).length === 0) return

      // Track fields that actually changed before updating state
      const currentProfile = profileRef.current
      const changedFields: Array<[string, string | number | boolean]> = []
      for (const [key, value] of Object.entries(extractedFields)) {
        if (currentProfile[key as keyof UserProfile] !== value) {
          changedFields.push([key, value])
        }
      }

      // Update profile
      updateProfile(extractedFields)

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
        // Get cleaned text (without pills) from editor
        const cleanedText = editorRef.current?.getTextWithoutPills() || ''
        if (!cleanedText.trim()) return

        // Get current profile state (pills) to send as structured data
        const pills = profileRef.current

        try {
          const result = await intakeMutation.mutateAsync({
            message: cleanedText,
            pills: Object.keys(pills).length > 0 ? pills : undefined,
            suppressedFields: suppression.getSuppressed(),
          })

          // Store latest intake result for prefill packet access
          setLatestIntakeResult(result)

          // Reconcile with backend response
          updateProfile(result.profile)
          // Backend now returns MissingField[] (structured objects) instead of string[]
          setHasBackendMissingFields(true)
          // Convert backend MissingField[] to frontend MissingFieldInfo[], then to component format
          const backendMissingFields: MissingField[] = result.missingFields
          const frontendMissingFields = convertMissingFieldsToInfo(backendMissingFields)
          setMissingFields(
            frontendMissingFields.map((field) => {
              // Get field display name from FIELD_METADATA
              const metadata = FIELD_METADATA[field.fieldKey as keyof typeof FIELD_METADATA]
              const displayName = metadata?.label || field.fieldKey
              return {
                name: displayName,
                priority: field.priority,
                fieldKey: field.fieldKey,
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
      }, EXTRACTION_DEBOUNCE_MS)

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
    [setCurrentField, setFieldModalOpen]
  )

  // Handle field modal submit
  // Only inserts text into editor - profile update happens via normal pill extraction flow
  const handleFieldModalSubmit = useCallback(
    (value: string) => {
      if (currentField) {
        // Get shortcut key for the field command
        const fieldCommand = currentField.key as FieldCommand
        const shortcutKey = COMMAND_TO_KEY[fieldCommand]

        // Insert field as key-value pair into editor (e.g., "k:2 " or "email:user@example.com ")
        // The KeyValuePlugin will parse this and create a pill, which will trigger handleFieldExtracted
        // This ensures the field appears in the textbox and follows the normal extraction flow
        const pillText = `${shortcutKey}:${value} `
        editorRef.current?.insertText(pillText)
      }
      setFieldModalOpen(false)
      setCurrentField(null)
    },
    [currentField, editorRef, setFieldModalOpen, setCurrentField]
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

  // Handle inferred field dismissal (Story 4.7)
  const handleDismissInference = useCallback(
    (fieldName: string) => {
      suppression.addSuppression(fieldName)
      toast({
        title: 'Field dismissed',
        description: `${fieldName} will not be inferred again this session`,
        duration: 3000,
      })
    },
    [suppression, toast]
  )

  // Handle inferred field edit (Story 4.4/4.5)
  const handleEditInference = useCallback(
    (fieldName: string, value: unknown) => {
      // Update profile with edited inferred value (stays as inferred)
      updateProfile({ [fieldName]: value })
    },
    [updateProfile]
  )

  // Handle convert inferred to known (Story 4.5/4.7)
  const handleConvertToKnown = useCallback(
    (fieldName: string, value: unknown) => {
      // Remove from suppression list (if present)
      suppression.removeSuppression(fieldName)
      // Update profile with known value
      updateProfile({ [fieldName]: value })
      toast({
        title: 'Field saved',
        description: `${fieldName} saved as known field`,
        duration: 3000,
      })
    },
    [suppression, updateProfile, toast]
  )

  // Handle action commands (reset, help, export, copy, etc.)
  const handleActionCommand = useCallback(
    (command: ActionCommand) => {
      if (command === 'reset') {
        // Clear all state atomically
        reset()
        setCurrentField(null)
        setFieldModalOpen(false)
        setHelpModalOpen(false)

        // Clear suppression list
        suppression.clearSuppressed()

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
        if (mode === 'policy' && policyAnalysisResult) {
          // Export savings pitch in policy mode
          try {
            exportSavingsPitch(policyAnalysisResult)
            // Log decision trace
            console.log('[Decision Trace] Export action', {
              timestamp: new Date().toISOString(),
              action: 'export',
              type: 'savings_pitch',
              summary: {
                opportunities: policyAnalysisResult.opportunities.length,
                bundleOptions: policyAnalysisResult.bundleOptions.length,
                deductibleOptimizations: policyAnalysisResult.deductibleOptimizations.length,
                carrier: policyAnalysisResult.currentPolicy.carrier,
                state: policyAnalysisResult.currentPolicy.state,
                product: policyAnalysisResult.currentPolicy.productType,
              },
            })
            toast({
              title: 'Export successful',
              description: 'Savings pitch exported as JSON',
              duration: 3000,
            })
          } catch (error) {
            toast({
              title: 'Export failed',
              description:
                error instanceof Error ? error.message : 'Failed to export savings pitch',
              variant: 'destructive',
              duration: 5000,
            })
          }
        } else {
          // Export prefill packet in intake mode
          handleExportCommand()
        }
      } else if (command === 'copy') {
        if (mode === 'policy' && policyAnalysisResult) {
          // Copy savings pitch in policy mode
          copySavingsPitchToClipboard(policyAnalysisResult)
            .then(() => {
              // Log decision trace
              console.log('[Decision Trace] Copy action', {
                timestamp: new Date().toISOString(),
                action: 'copy',
                type: 'savings_pitch',
                summary: {
                  opportunities: policyAnalysisResult.opportunities.length,
                  bundleOptions: policyAnalysisResult.bundleOptions.length,
                  deductibleOptimizations: policyAnalysisResult.deductibleOptimizations.length,
                  carrier: policyAnalysisResult.currentPolicy.carrier,
                  state: policyAnalysisResult.currentPolicy.state,
                  product: policyAnalysisResult.currentPolicy.productType,
                },
              })
              toast({
                title: 'Copied to clipboard',
                description: 'Savings pitch copied to clipboard',
                duration: 3000,
              })
            })
            .catch((error) => {
              toast({
                title: 'Copy failed',
                description: error instanceof Error ? error.message : 'Failed to copy to clipboard',
                variant: 'destructive',
                duration: 5000,
              })
            })
        } else {
          // Copy prefill packet in intake mode
          handleCopyCommand()
        }
      }
    },
    [
      toast,
      editorRef,
      handleExportCommand,
      handleCopyCommand,
      mode,
      policyAnalysisResult,
      reset,
      setCurrentField,
      setFieldModalOpen,
      setHelpModalOpen,
      suppression,
    ]
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
            <UploadPanel
              onPolicyExtracted={(summary) => {
                setPolicySummary(summary)
                // Activate interface when policy is extracted
                if (!isActive) {
                  // Trigger activation through content change
                  handleContentChange('')
                }
              }}
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
            {/* Notes Input (always visible, at top) */}
            <div className="flex-1 overflow-hidden">
              <NotesPanel
                mode={mode}
                onFieldExtracted={handleFieldExtracted}
                onFieldRemoved={handleFieldRemoved}
                onContentChange={handleContentChange}
                onActionCommand={handleActionCommandMerged}
                onCommandError={handleCommandErrorMerged}
                editorRef={editorRef}
                autoFocus={!isActive}
                inferredFields={{}}
                inferenceReasons={{}}
                confidence={{}}
                onDismissInference={handleDismissInference}
                onEditInference={handleEditInference}
                onConvertToKnown={handleConvertToKnown}
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
              policySummary={policySummary}
              confidence={latestIntakeResult?.confidence}
              policyAnalysisResult={policyAnalysisResult}
              isAnalyzing={policyAnalysisMutation.isPending}
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
