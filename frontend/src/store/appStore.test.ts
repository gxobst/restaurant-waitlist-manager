import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from './appStore'

vi.mock('../services/index.ts', () => ({}))

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentView: 'host',
      isManager: false,
      wsConnected: false,
      lastAction: null,
      toasts: [],
    })
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useAppStore.getState()
      expect(state.currentView).toBe('host')
      expect(state.isManager).toBe(false)
      expect(state.wsConnected).toBe(false)
      expect(state.lastAction).toBeNull()
      expect(state.toasts).toEqual([])
    })
  })

  describe('setCurrentView', () => {
    it('should update currentView', () => {
      useAppStore.getState().setCurrentView('manager')
      expect(useAppStore.getState().currentView).toBe('manager')
    })

    it('should work with different view strings', () => {
      useAppStore.getState().setCurrentView('settings')
      expect(useAppStore.getState().currentView).toBe('settings')

      useAppStore.getState().setCurrentView('reports')
      expect(useAppStore.getState().currentView).toBe('reports')
    })
  })

  describe('setIsManager', () => {
    it('should update isManager to true', () => {
      useAppStore.getState().setIsManager(true)
      expect(useAppStore.getState().isManager).toBe(true)
    })

    it('should update isManager to false', () => {
      useAppStore.getState().setIsManager(true)
      useAppStore.getState().setIsManager(false)
      expect(useAppStore.getState().isManager).toBe(false)
    })
  })

  describe('setWsConnected', () => {
    it('should update wsConnected to true', () => {
      useAppStore.getState().setWsConnected(true)
      expect(useAppStore.getState().wsConnected).toBe(true)
    })

    it('should update wsConnected to false', () => {
      useAppStore.getState().setWsConnected(true)
      useAppStore.getState().setWsConnected(false)
      expect(useAppStore.getState().wsConnected).toBe(false)
    })
  })

  describe('setLastAction', () => {
    it('should update lastAction with an object', () => {
      const action = { type: 'ADD_PARTY', payload: { name: 'Test Party' } }
      useAppStore.getState().setLastAction(action)
      expect(useAppStore.getState().lastAction).toEqual(action)
    })

    it('should update lastAction to null', () => {
      useAppStore.getState().setLastAction({ type: 'TEST' })
      useAppStore.getState().setLastAction(null)
      expect(useAppStore.getState().lastAction).toBeNull()
    })
  })

  describe('addToast', () => {
    it('should append a toast with a generated id', () => {
      const store = useAppStore.getState()
      store.addToast({ message: 'New party added', partyId: '1', actionType: 'notify' })
      const state = useAppStore.getState()
      expect(state.toasts).toHaveLength(1)
      expect(state.toasts[0].message).toBe('New party added')
      expect(state.toasts[0].partyId).toBe('1')
      expect(state.toasts[0].actionType).toBe('notify')
      expect(state.toasts[0].id).toBeTruthy()
      expect(typeof state.toasts[0].id).toBe('string')
    })

    it('should allow adding multiple toasts with unique ids', () => {
      const store = useAppStore.getState()
      store.addToast({ message: 'First', partyId: '1', actionType: 'notify' })
      store.addToast({ message: 'Second', partyId: '2', actionType: 'seat' })
      const state = useAppStore.getState()
      expect(state.toasts).toHaveLength(2)
      expect(state.toasts[0].id).not.toBe(state.toasts[1].id)
    })
  })

  describe('removeToast', () => {
    it('should remove the matching toast by id', () => {
      const store = useAppStore.getState()
      store.addToast({ message: 'To remove', partyId: '1', actionType: 'notify' })
      const allToasts = useAppStore.getState().toasts
      store.removeToast(allToasts[0].id)
      expect(useAppStore.getState().toasts).toHaveLength(0)
    })

    it('should not remove other toasts when removing by id', () => {
      const store = useAppStore.getState()
      store.addToast({ message: 'Keep me', partyId: '1', actionType: 'notify' })
      store.addToast({ message: 'Remove me', partyId: '2', actionType: 'seat' })
      const allToasts = useAppStore.getState().toasts
      store.removeToast(allToasts[1].id)
      const state = useAppStore.getState()
      expect(state.toasts).toHaveLength(1)
      expect(state.toasts[0].message).toBe('Keep me')
    })
  })

  describe('selectors', () => {
    it('should return currentView via selector', () => {
      const view = useAppStore.getState().currentView
      expect(view).toBe('host')
    })

    it('should return isManager via selector', () => {
      const isManager = useAppStore.getState().isManager
      expect(isManager).toBe(false)
    })

    it('should return wsConnected via selector', () => {
      const wsConnected = useAppStore.getState().wsConnected
      expect(wsConnected).toBe(false)
    })

    it('should return lastAction via selector', () => {
      const lastAction = useAppStore.getState().lastAction
      expect(lastAction).toBeNull()
    })
  })

  describe('combined state updates', () => {
    it('should handle multiple state updates', () => {
      const store = useAppStore.getState()
      store.setCurrentView('manager')
      store.setIsManager(true)
      store.setWsConnected(true)
      store.setLastAction({ type: 'LOGIN' })
      store.addToast({ message: 'Welcome', partyId: '1', actionType: 'notify' })

      const state = useAppStore.getState()
      expect(state.currentView).toBe('manager')
      expect(state.isManager).toBe(true)
      expect(state.wsConnected).toBe(true)
      expect(state.lastAction).toEqual({ type: 'LOGIN' })
      expect(state.toasts).toHaveLength(1)
      expect(state.toasts[0].message).toBe('Welcome')
    })
  })
})
