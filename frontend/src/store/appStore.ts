import { create } from 'zustand'

export type ActionType = 'notify' | 'seat' | 'cancel' | 'toggle_urgent'

export interface Toast {
  id: string
  message: string
  partyId: string
  actionType: ActionType
}

export interface AppState {
  currentView: string
  isManager: boolean
  wsConnected: boolean
  lastAction: { type: string; payload?: unknown } | null
  toasts: Toast[]
}

export interface AppActions {
  setCurrentView: (view: string) => void
  setIsManager: (isManager: boolean) => void
  setWsConnected: (connected: boolean) => void
  setLastAction: (action: { type: string; payload?: unknown } | null) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export type AppStore = AppState & AppActions

export const useAppStore = create<AppStore>((set) => ({
  currentView: 'host',
  isManager: false,
  wsConnected: false,
  lastAction: null,
  toasts: [],
  setCurrentView: (view) => set({ currentView: view }),
  setIsManager: (isManager) => set({ isManager }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setLastAction: (action) => set({ lastAction: action }),
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))