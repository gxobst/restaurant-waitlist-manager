import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, useIsFetching } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getTables, createTable, deleteTable, getAvgTurnoverTime, setAvgTurnoverTime, changePin } from '../services/index.ts'
import { useAppStore } from '../store/appStore.ts'
import ErrorBoundary from '../components/ErrorBoundary.tsx'
import SkeletonLoader from '../components/SkeletonLoader.tsx'

export default function ManagerSettings() {
  const navigate = useNavigate()
  const isManager = useAppStore((s) => s.isManager)

  if (!isManager) {
    navigate('/')
    return null
  }

  const queryClient = useQueryClient()
  const isFetching = useIsFetching()

  const { data: tables = [], isError: tablesError, refetch: refetchTables } = useQuery({
    queryKey: ['tables'],
    queryFn: getTables,
  })

  const { data: avgTurnoverTime = 45, isError: avgTimeError, refetch: refetchAvgTime } = useQuery({
    queryKey: ['avgTurnoverTime'],
    queryFn: getAvgTurnoverTime,
  })

  const createMutation = useMutation({
    mutationFn: createTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })

  const turnoverMutation = useMutation({
    mutationFn: setAvgTurnoverTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avgTurnoverTime'] })
    },
  })

  if (isFetching > 0) {
    return (
      <div className="space-y-6 p-4">
        <SkeletonLoader lines={6} />
      </div>
    )
  }

  if (tablesError || avgTimeError) {
    return (
      <div className="space-y-6 p-4">
        <div data-testid="error-boundary" className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-sm font-medium text-red-800">Something went wrong</p>
          <p className="text-sm text-red-600 mt-1">Failed to load settings. Please check your connection and try again.</p>
            <button
              type="button"
              onClick={() => { refetchTables(); refetchAvgTime() }}
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
      <div className="space-y-6 p-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        {/* Table Management Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Table Management</h2>

          {tables.length === 0 ? (
            <p className="text-gray-500 text-sm">No tables configured</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {tables.map((table) => (
                <li
                  key={table.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <span className="font-medium text-gray-900">{table.label}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      (Capacity: {table.capacity})
                    </span>
                    {table.is_occupied && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Occupied
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this table?')) {
                        deleteMutation.mutate(table.id)
                      }
                    }}
                    className="px-3 py-1 text-sm font-medium min-h-12 text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          <AddTableForm
            onSubmit={(data) => createMutation.mutate(data)}
            isSubmitting={createMutation.isPending}
          />
        </section>

        {/* Change PIN Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change PIN</h2>
          <ChangePinForm />
        </section>

        {/* Wait Time Config Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Wait Time Config</h2>
          <TurnoverTimeConfig
            currentValue={avgTurnoverTime}
            onSave={(value) => turnoverMutation.mutate(value)}
            isSaving={turnoverMutation.isPending}
          />
        </section>
      </div>
    </ErrorBoundary>
  )
}

interface AddTableFormData {
  label: string
  capacity: number
}

interface AddTableFormProps {
  onSubmit: (data: AddTableFormData) => void
  isSubmitting: boolean
}

function AddTableForm({ onSubmit, isSubmitting }: AddTableFormProps) {
  const [label, setLabel] = useState('')
  const [capacity, setCapacity] = useState('')
  const [errors, setErrors] = useState<{ label?: string; capacity?: string }>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: { label?: string; capacity?: string } = {}

    if (!label.trim()) {
      newErrors.label = 'Label is required'
    }

    const capacityNum = Number(capacity)
    if (!capacity || isNaN(capacityNum)) {
      newErrors.capacity = 'Capacity is required'
    } else if (capacityNum < 1 || capacityNum > 20) {
      newErrors.capacity = 'Capacity must be between 1 and 20'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    onSubmit({ label: label.trim(), capacity: capacityNum })
    setLabel('')
    setCapacity('')
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Add Table</h3>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              setErrors((prev) => ({ ...prev, label: undefined }))
            }}
            placeholder="Table label"
            className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.label && (
            <p className="mt-1 text-sm text-red-600">{errors.label}</p>
          )}
        </div>
        <div className="w-24">
          <input
            type="number"
            min="1"
            max="20"
            value={capacity}
            onChange={(e) => {
              setCapacity(e.target.value)
              setErrors((prev) => ({ ...prev, capacity: undefined }))
            }}
            placeholder="Capacity"
            className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.capacity && (
            <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  )
}

interface ChangePinFormState {
  currentPin: string
  newPin: string
  confirmPin: string
}

function ChangePinForm() {
  const [state, setState] = useState<ChangePinFormState>({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  })
  const [errors, setErrors] = useState<{ general?: string; newPin?: string }>({})
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: changePin,
    onSuccess: () => {
      setSuccess(true)
      setState({ currentPin: '', newPin: '', confirmPin: '' })
      setErrors({})
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: () => {
      setErrors({ general: 'Failed to change PIN. Please try again.' })
    },
  })

  function handleChange(field: keyof ChangePinFormState, value: string) {
    const numericValue = value.replace(/\D/g, '')
    setState((prev) => ({ ...prev, [field]: numericValue }))
    setErrors({})
    setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: { general?: string; newPin?: string } = {}

    if (state.newPin !== state.confirmPin) {
      newErrors.newPin = 'New PIN and confirm PIN do not match'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    mutation.mutate({
      current_pin: state.currentPin,
      new_pin: state.newPin,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="current-pin" className="block text-sm font-medium text-gray-700 mb-1">
          Current PIN
        </label>
        <input
          id="current-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={state.currentPin}
          onChange={(e) => handleChange('currentPin', e.target.value)}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="new-pin" className="block text-sm font-medium text-gray-700 mb-1">
          New PIN
        </label>
        <input
          id="new-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={state.newPin}
          onChange={(e) => handleChange('newPin', e.target.value)}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="confirm-pin" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm New PIN
        </label>
        <input
          id="confirm-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={state.confirmPin}
          onChange={(e) => handleChange('confirmPin', e.target.value)}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.newPin && (
          <p className="mt-1 text-sm text-red-600">{errors.newPin}</p>
        )}
      </div>

      {errors.general && (
        <p className="text-sm text-red-600">{errors.general}</p>
      )}

      {success && (
        <p className="text-sm text-green-600">PIN changed successfully</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !state.currentPin || !state.newPin || !state.confirmPin}
        className="min-h-12 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Changing...' : 'Change PIN'}
      </button>
    </form>
  )
}

interface TurnoverTimeConfigProps {
  currentValue: number
  onSave: (value: number) => void
  isSaving: boolean
}

function TurnoverTimeConfig({ currentValue, onSave, isSaving }: TurnoverTimeConfigProps) {
  const [value, setValue] = useState(String(currentValue))
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = Number(value)
    if (isNaN(num) || num < 5 || num > 120) {
      setError('Value must be between 5 and 120 minutes')
      return
    }
    setError(null)
    onSave(num)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex-1">
        <label htmlFor="avg-turnover" className="block text-sm font-medium text-gray-700 mb-1">
          Average Turnover Time (minutes)
        </label>
        <input
          id="avg-turnover"
          type="number"
          min="5"
          max="120"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={isSaving}
          className="min-h-12 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
