import { useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTables, updateTable, updateParty } from '../services/index.ts'
import { useAppStore } from '../store/appStore.ts'
import type { Table, Party } from '../types/index.ts'

interface TableSelectionModalProps {
  party: Party
  isOpen: boolean
  onClose: () => void
}

function groupByCapacity(tables: Table[]): Map<number, Table[]> {
  const grouped = new Map<number, Table[]>()
  for (const table of tables) {
    const existing = grouped.get(table.capacity) ?? []
    existing.push(table)
    grouped.set(table.capacity, existing)
  }
  return grouped
}

function capacityLabel(capacity: number): string {
  return `${capacity}-Top`
}

export default function TableSelectionModal({ party, isOpen, onClose }: TableSelectionModalProps) {
  const queryClient = useQueryClient()
  const setLastAction = useAppStore((s) => s.setLastAction)
  const addToast = useAppStore((s) => s.addToast)

  const { data: tables, isLoading, error } = useQuery({
    queryKey: ['tables'],
    queryFn: getTables,
    enabled: isOpen,
  })

  const seatMutation = useMutation({
    mutationFn: async (tableId: string) => {
      await updateTable(tableId, {
        is_occupied: true,
        occupied_by_party_id: party.id,
      })
      await updateParty(party.id, { status: 'seated' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      setLastAction({ type: 'seat', payload: party.id })
      addToast({ message: 'Party seated', partyId: party.id, actionType: 'seat' })
      onClose()
    },
  })

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const grouped = tables ? groupByCapacity(tables) : new Map<number, Table[]>()
  const allOccupied = tables ? tables.every((t) => t.is_occupied) : false
  const noTables = !isLoading && (!tables || tables.length === 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Select a table"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Seat {party.name} (Party of {party.party_size})
          </h2>
        </div>

        <div className="px-6 py-4">
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">Failed to load tables. Please try again.</p>
            </div>
          )}

          {!isLoading && !error && (noTables || allOccupied) && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No tables available</p>
            </div>
          )}

          {!isLoading && !error && !noTables && !allOccupied && (
            <div className="space-y-4">
              {Array.from(grouped.entries())
                .sort(([a], [b]) => a - b)
                .map(([capacity, capacityTables]) => (
                  <div key={capacity}>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      {capacityLabel(capacity)}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {capacityTables.map((table) => (
                        <button
                          key={table.id}
                          type="button"
                          disabled={table.is_occupied || seatMutation.isPending}
                          onClick={() => seatMutation.mutate(table.id)}
                          className={`min-h-12 px-3 py-2 text-sm font-medium border rounded transition-colors ${
                            table.is_occupied
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                              : 'bg-white text-gray-900 border-green-300 hover:bg-green-50 cursor-pointer'
                          }`}
                        >
                          {table.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={seatMutation.isPending}
            className="min-h-12 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
