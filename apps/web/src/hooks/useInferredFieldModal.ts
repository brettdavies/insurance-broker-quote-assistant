/**
 * useInferredFieldModal Hook
 *
 * Manages inferred field modal state and operations.
 *
 * Single Responsibility: Inferred field modal state management only
 */

import { useCallback, useState } from 'react'

interface InferredModalField {
  fieldName: string
  fieldLabel: string
  value: unknown
}

export function useInferredFieldModal() {
  const [inferredModalOpen, setInferredModalOpen] = useState(false)
  const [inferredModalField, setInferredModalField] = useState<InferredModalField | null>(null)

  const openModal = useCallback((field: InferredModalField) => {
    setInferredModalField(field)
    setInferredModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setInferredModalOpen(false)
    setInferredModalField(null)
  }, [])

  return {
    inferredModalOpen,
    inferredModalField,
    setInferredModalOpen,
    openModal,
    closeModal,
  }
}
