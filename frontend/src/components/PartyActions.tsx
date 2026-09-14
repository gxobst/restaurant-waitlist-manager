import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateParty } from '../services/index.ts'
import { useAppStore } from '../store/appStore.ts'
import type { ActionType } from '../store/appStore.ts'
import type { Party, PartyStatus } from '../types/index.ts'

const NOTIFY_DISABLED_STATUSES: PartyStatus[] = ['seated', 'canceled', 'no_show']
const SEAT_DISABLED_STATUSES: PartyStatus[] = ['waiting', 'canceled', 'no_show']
const CANCEL_DISABLED_STATUSES: PartyStatus[] = ['seated', 'no_show']

interface PartyActionsProps {
  party: Party
  onSeat?: (party: Party) => void
}

export default function PartyActions({ party, onSeat }: PartyActionsProps) {
  const queryClient = useQueryClient()
  const setLastAction = useAppStore((s) => s.setLastAction)
  const addToast = useAppStore((s) => s.addToast)

  const mutation = useMutation({
    mutationFn: (data: { status?: PartyStatus; urgent?: boolean }) =>
      updateParty(party.id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      const actionType: ActionType =
        'status' in variables
          ? (variables.status === 'notified'
              ? 'notify'
              : variables.status === 'seated'
                ? 'seat'
                : variables.status === 'canceled'
                  ? 'cancel'
                  : 'toggle_urgent')
          : 'toggle_urgent'
      const messages: Record<ActionType, string> = {
        notify: 'Party notified',
        seat: 'Party seated',
        cancel: 'Party canceled',
        toggle_urgent: 'Party marked urgent',
      }
      addToast({ message: messages[actionType], partyId: party.id, actionType })
    },
    onError: () => {
      addToast({ message: 'Action failed. Please try again.', partyId: party.id, actionType: 'notify' })
    },
  })

  const isPending = mutation.isPending

  function notify() {
    mutation.mutate(
      { status: 'notified' },
      { onSuccess: () => setLastAction({ type: 'notify', payload: party.id }) },
    )
  }

  function seat() {
    if (onSeat) {
      onSeat(party)
      return
    }
    mutation.mutate(
      { status: 'seated' },
      { onSuccess: () => setLastAction({ type: 'seat', payload: party.id }) },
    )
  }

  function cancel() {
    mutation.mutate(
      { status: 'canceled' },
      { onSuccess: () => setLastAction({ type: 'cancel', payload: party.id }) },
    )
  }

  function toggleUrgent() {
    mutation.mutate(
      { urgent: !party.urgent },
      { onSuccess: () => setLastAction({ type: 'toggle_urgent', payload: party.id }) },
    )
  }

  return (
    <div className="flex gap-2 mt-2">
      <button
        type="button"
        disabled={isPending || NOTIFY_DISABLED_STATUSES.includes(party.status)}
        onClick={notify}
        className="min-h-12 px-2 py-1 text-xs font-medium border border-blue-300 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Notify
      </button>
      <button
        type="button"
        disabled={isPending || SEAT_DISABLED_STATUSES.includes(party.status)}
        onClick={seat}
        className="min-h-12 px-2 py-1 text-xs font-medium border border-green-300 text-green-700 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Seat
      </button>
      <button
        type="button"
        disabled={isPending || CANCEL_DISABLED_STATUSES.includes(party.status)}
        onClick={cancel}
        className="min-h-12 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={toggleUrgent}
        className="min-h-12 px-2 py-1 text-xs font-medium border border-orange-300 text-orange-700 rounded hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Mark Urgent
      </button>
    </div>
  )
}
