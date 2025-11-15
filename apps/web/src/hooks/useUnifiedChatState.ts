import type { MissingField as MissingFieldInfo } from '@/components/sidebar/MissingFields'
import type {
  IntakeResult,
  MissingField,
  PolicyAnalysisResult,
  PolicySummary,
  PrefillPacket,
  UserProfile,
} from '@repo/shared'
import { useCallback, useReducer, useRef } from 'react'

interface UnifiedChatState {
  profile: UserProfile
  missingFields: MissingFieldInfo[]
  latestIntakeResult: IntakeResult | null
  policySummary: PolicySummary | undefined
  policyAnalysisResult: PolicyAnalysisResult | undefined
  hasBackendMissingFields: boolean
  fieldModalOpen: boolean
  currentField: { key: string; value?: string | number | boolean } | null
  helpModalOpen: boolean
  prefillModalOpen: boolean
  prefillData: PrefillPacket | null
}

type UnifiedChatAction =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'REMOVE_FIELD'; payload: string }
  | { type: 'SET_MISSING_FIELDS'; payload: MissingFieldInfo[] }
  | { type: 'SET_LATEST_INTAKE_RESULT'; payload: IntakeResult | null }
  | { type: 'SET_POLICY_SUMMARY'; payload: PolicySummary | undefined }
  | { type: 'SET_POLICY_ANALYSIS_RESULT'; payload: PolicyAnalysisResult | undefined }
  | { type: 'SET_HAS_BACKEND_MISSING_FIELDS'; payload: boolean }
  | { type: 'SET_FIELD_MODAL_OPEN'; payload: boolean }
  | {
      type: 'SET_CURRENT_FIELD'
      payload: { key: string; value?: string | number | boolean } | null
    }
  | { type: 'SET_HELP_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_PREFILL_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_PREFILL_DATA'; payload: PrefillPacket | null }
  | { type: 'RESET' }

const initialState: UnifiedChatState = {
  profile: {},
  missingFields: [],
  latestIntakeResult: null,
  policySummary: undefined,
  policyAnalysisResult: undefined,
  hasBackendMissingFields: false,
  fieldModalOpen: false,
  currentField: null,
  helpModalOpen: false,
  prefillModalOpen: false,
  prefillData: null,
}

function unifiedChatReducer(state: UnifiedChatState, action: UnifiedChatAction): UnifiedChatState {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: action.payload }
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } }
    case 'REMOVE_FIELD': {
      const updated = { ...state.profile }
      delete updated[action.payload as keyof UserProfile]
      return { ...state, profile: updated }
    }
    case 'SET_MISSING_FIELDS':
      return { ...state, missingFields: action.payload }
    case 'SET_LATEST_INTAKE_RESULT':
      return { ...state, latestIntakeResult: action.payload }
    case 'SET_POLICY_SUMMARY':
      return { ...state, policySummary: action.payload }
    case 'SET_POLICY_ANALYSIS_RESULT':
      return { ...state, policyAnalysisResult: action.payload }
    case 'SET_HAS_BACKEND_MISSING_FIELDS':
      return { ...state, hasBackendMissingFields: action.payload }
    case 'SET_FIELD_MODAL_OPEN':
      return { ...state, fieldModalOpen: action.payload }
    case 'SET_CURRENT_FIELD':
      return { ...state, currentField: action.payload }
    case 'SET_HELP_MODAL_OPEN':
      return { ...state, helpModalOpen: action.payload }
    case 'SET_PREFILL_MODAL_OPEN':
      return { ...state, prefillModalOpen: action.payload }
    case 'SET_PREFILL_DATA':
      return { ...state, prefillData: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

/**
 * Unified Chat State Hook
 *
 * Manages all state for UnifiedChatInterface using useReducer for atomic updates.
 * Provides synchronized profile ref for callbacks.
 */
export function useUnifiedChatState() {
  const [state, dispatch] = useReducer(unifiedChatReducer, initialState)
  const profileRef = useRef<UserProfile>(state.profile)

  // Keep ref in sync with state
  profileRef.current = state.profile

  const setProfile = useCallback((profile: UserProfile) => {
    dispatch({ type: 'SET_PROFILE', payload: profile })
  }, [])

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: updates })
  }, [])

  const removeField = useCallback((fieldName: string) => {
    dispatch({ type: 'REMOVE_FIELD', payload: fieldName })
  }, [])

  const setMissingFields = useCallback((fields: MissingFieldInfo[]) => {
    dispatch({ type: 'SET_MISSING_FIELDS', payload: fields })
  }, [])

  const setLatestIntakeResult = useCallback((result: IntakeResult | null) => {
    dispatch({ type: 'SET_LATEST_INTAKE_RESULT', payload: result })
  }, [])

  const setPolicySummary = useCallback((summary: PolicySummary | undefined) => {
    dispatch({ type: 'SET_POLICY_SUMMARY', payload: summary })
  }, [])

  const setPolicyAnalysisResult = useCallback((result: PolicyAnalysisResult | undefined) => {
    dispatch({ type: 'SET_POLICY_ANALYSIS_RESULT', payload: result })
  }, [])

  const setHasBackendMissingFields = useCallback((value: boolean) => {
    dispatch({ type: 'SET_HAS_BACKEND_MISSING_FIELDS', payload: value })
  }, [])

  const setFieldModalOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_FIELD_MODAL_OPEN', payload: open })
  }, [])

  const setCurrentField = useCallback(
    (field: { key: string; value?: string | number | boolean } | null) => {
      dispatch({ type: 'SET_CURRENT_FIELD', payload: field })
    },
    []
  )

  const setHelpModalOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_HELP_MODAL_OPEN', payload: open })
  }, [])

  const setPrefillModalOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_PREFILL_MODAL_OPEN', payload: open })
  }, [])

  const setPrefillData = useCallback((prefill: PrefillPacket | null) => {
    dispatch({ type: 'SET_PREFILL_DATA', payload: prefill })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    profileRef,
    setProfile,
    updateProfile,
    removeField,
    setMissingFields,
    setLatestIntakeResult,
    setPolicySummary,
    setPolicyAnalysisResult,
    setHasBackendMissingFields,
    setFieldModalOpen,
    setCurrentField,
    setHelpModalOpen,
    setPrefillModalOpen,
    setPrefillData,
    reset,
  }
}
