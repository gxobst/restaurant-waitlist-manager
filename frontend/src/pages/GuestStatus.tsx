import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getPartyByToken, confirmWaiting, cancelParty } from '../services/index.ts'
import ErrorBoundary from '../components/ErrorBoundary.tsx'
import SkeletonLoader from '../components/SkeletonLoader.tsx'
import type { PartyStatus } from '../types/index.ts'

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

export default function GuestStatus() {
  const { token } = useParams<{ token: string }>()

  const { data: party, isLoading, isError, refetch } = useQuery({
    queryKey: ['partyByToken', token],
    queryFn: () => getPartyByToken(token!),
    enabled: !!token,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-sm">
          <SkeletonLoader lines={6} />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div data-testid="error-boundary" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-sm w-full">
          <p className="text-sm font-medium text-red-800">Unable to load your party</p>
          <p className="text-sm text-red-600 mt-1">There was a problem connecting to the restaurant. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
              className="mt-3 px-4 py-2 text-sm font-medium min-h-12 text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Party not found</h2>
          <p className="text-gray-500 text-sm">The link you followed is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const actionable = party.status === 'waiting' || party.status === 'notified'

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-sm mx-auto p-4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">You're on the list!</h1>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Party name</span>
                <span className="font-semibold text-gray-900">{party.name}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Party size</span>
                <span className="font-semibold text-gray-900">{party.party_size}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Position</span>
                <span className="font-semibold text-gray-900">
                  {party.position !== null ? `#${party.position}` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Est. wait</span>
                <span className="font-semibold text-gray-900">
                  {party.estimated_wait !== null ? `${party.estimated_wait} min` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-500">Status</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_STYLES[party.status]}`}>
                  {STATUS_LABELS[party.status]}
                </span>
              </div>
            </div>

            {actionable && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={async () => {
                    await confirmWaiting(party.token!)
                    alert('You have been confirmed! Please head to the restaurant.')
                  }}
                  className="w-full min-h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg touch-manipulation active:bg-green-800 transition-colors"
                >
                  Confirm I'm Waiting
                </button>

                <button
                  onClick={async () => {
                    const confirmed = window.confirm('Are you sure you want to cancel your spot in line?')
                    if (confirmed) {
                      await cancelParty(party.token!)
                      alert('Your party has been canceled.')
                    }
                  }}
                  className="w-full min-h-12 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 touch-manipulation active:bg-gray-100 transition-colors"
                >
                  Cancel My Spot
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">
            Show this page to the host when you arrive.
          </p>
        </div>
      </div>
    </ErrorBoundary>
  )
}
