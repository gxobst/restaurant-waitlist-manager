import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getWaitlist, getWaitlistPaused } from '../services/index.ts'
import PartyActions from '../components/PartyActions.tsx'
import TableSelectionModal from '../components/TableSelectionModal.tsx'
import ManagerPinModal from '../components/ManagerPinModal.tsx'
import UndoBar from '../components/UndoBar.tsx'
import PauseToggle from '../components/PauseToggle.tsx'
import AddPartyForm from '../components/AddPartyForm.tsx'
import ErrorBoundary from '../components/ErrorBoundary.tsx'
import SkeletonLoader from '../components/SkeletonLoader.tsx'
import { useAppStore } from '../store/appStore.ts'
import { useWebSocket } from '../hooks/useWebSocket'
import type { Party, PartyStatus } from '../types/index.ts'

function maskPhone(phone: string | null): string {
  if (!phone) return '—'
  const last4 = phone.slice(-4)
  return `***-***-${last4}`
}

const STATUS_STYLES: Record<PartyStatus, string> = {
  waiting: 'bg-blue-100 text-blue-800',
  notified: 'bg-yellow-100 text-yellow-800',
  seated: 'bg-green-100 text-green-800',
  canceled: 'bg-gray-100 text-gray-800',
  no_show: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<PartyStatus, string> = {
  waiting: 'Waiting',
  notified: 'Notified',
  seated: 'Seated',
  canceled: 'Canceled',
  no_show: 'No Show',
}

export default function HostView() {
  const [seatingParty, setSeatingParty] = useState<Party | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const isManager = useAppStore((s) => s.isManager)
  const wsConnected = useAppStore((s) => s.wsConnected)
  const isMock = import.meta.env.VITE_USE_MOCK === 'true'

  useWebSocket()

  const { data: parties, isLoading, isError: waitlistError, refetch: refetchWaitlist } = useQuery({
    queryKey: ['waitlist'],
    queryFn: getWaitlist,
  })

  const { data: paused = false, isError: pausedError, refetch: refetchPaused } = useQuery({
    queryKey: ['waitlistPaused'],
    queryFn: getWaitlistPaused,
  })

  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonLoader lines={5} />
      </div>
    )
  }

  if (waitlistError || pausedError) {
    return (
      <div className="p-4">
        <div data-testid="error-boundary" className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-sm font-medium text-red-800">Something went wrong</p>
          <p className="text-sm text-red-600 mt-1">Failed to load the waitlist. Please check your connection and try again.</p>
            <button
              type="button"
              onClick={() => { refetchWaitlist(); refetchPaused() }}
              className="mt-3 px-4 py-2 text-sm font-medium min-h-12 text-white bg-red-600 rounded-md hover:bg-red-700"
            >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Waitlist</h2>
          <div className="flex items-center gap-2">
            {!isMock && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {wsConnected ? 'Connected' : 'Disconnected'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              className={`px-3 py-1 text-sm font-medium min-h-12 border rounded ${
                isManager
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isManager ? 'Manager' : 'Manager'}
            </button>
            <PauseToggle />
          </div>
        </div>

        {paused && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p className="text-sm font-medium text-yellow-800">Waitlist Paused</p>
          </div>
        )}

        {!paused && <AddPartyForm />}

        {(!parties || parties.length === 0) && !paused ? (
          <div className="text-center text-gray-500 py-8">
            No parties waiting
          </div>
        ) : (
          parties?.map((party) => (
            <div
              key={party.id}
              className={`p-4 rounded-lg border ${
                party.urgent
                  ? 'border-l-4 border-l-red-500 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    #{party.position ?? '—'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{party.name}</p>
                    <p className="text-sm text-gray-500">
                      Party of {party.party_size}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[party.status]}`}
                >
                  {STATUS_LABELS[party.status]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                <div>
                  <span className="text-gray-400">Phone: </span>
                  {maskPhone(party.phone)}
                </div>
                <div>
                  <span className="text-gray-400">Est. wait: </span>
                  {party.estimated_wait !== null ? `${party.estimated_wait}m` : '—'}
                </div>
              </div>

              <PartyActions party={party} onSeat={(p) => setSeatingParty(p)} />
            </div>
          ))
        )}

        {seatingParty && (
          <TableSelectionModal
            party={seatingParty}
            isOpen={true}
            onClose={() => setSeatingParty(null)}
          />
        )}

        <ManagerPinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
        />

        <UndoBar />
      </div>
    </ErrorBoundary>
  )
}
