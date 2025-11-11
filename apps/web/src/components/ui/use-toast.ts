import type { ToastActionElement, ToastProps } from '@/components/ui/toast'
import * as React from 'react'

const TOAST_LIMIT = 5 // Allow multiple toasts to stack
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType['ADD_TOAST']
      toast: ToasterToast
    }
  | {
      type: ActionType['UPDATE_TOAST']
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType['DISMISS_TOAST']
      toastId?: ToasterToast['id']
    }
  | {
      type: ActionType['REMOVE_TOAST']
      toastId?: ToasterToast['id']
    }

interface State {
  toasts: ToasterToast[]
}

// Separate maps for auto-dismiss and removal queue timeouts
const autoDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const removalTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  // Clear any existing removal timeout
  const existingTimeout = removalTimeouts.get(toastId)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  // Schedule removal from DOM after animation completes
  const timeout = setTimeout(() => {
    removalTimeouts.delete(toastId)
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  removalTimeouts.set(toastId, timeout)
}

const scheduleAutoDismiss = (toastId: string, duration?: number) => {
  if (!duration || duration <= 0) {
    return // No auto-dismiss if duration is not set or invalid
  }

  // Clear any existing auto-dismiss timeout for this toast (in case toast is updated)
  const existingTimeout = autoDismissTimeouts.get(toastId)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  const timeout = setTimeout(() => {
    // Check if this timeout is still active (toast wasn't manually dismissed)
    if (autoDismissTimeouts.get(toastId) === timeout) {
      autoDismissTimeouts.delete(toastId)
      // Dismiss the toast (this will trigger onOpenChange and addToRemoveQueue)
      dispatch({
        type: 'DISMISS_TOAST',
        toastId: toastId,
      })
    }
  }, duration)

  autoDismissTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        for (const toast of state.toasts) {
          addToRemoveQueue(toast.id)
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  for (const listener of listeners) {
    listener(memoryState)
  }
}

type Toast = Omit<ToasterToast, 'id'>

function toast({ duration, ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    })
  const dismiss = () => {
    // Clear any auto-dismiss timeout for this toast
    const autoDismissTimeout = autoDismissTimeouts.get(id)
    if (autoDismissTimeout) {
      clearTimeout(autoDismissTimeout)
      autoDismissTimeouts.delete(id)
    }
    dispatch({ type: 'DISMISS_TOAST', toastId: id })
  }

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      duration,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // Schedule auto-dismiss if duration is provided
  scheduleAutoDismiss(id, duration)

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
