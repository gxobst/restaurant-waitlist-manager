import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getWaitlistPaused, setWaitlistPaused } from '../services/index.ts'

export default function PauseToggle() {
  const queryClient = useQueryClient()

  const { data: paused = false, isLoading } = useQuery({
    queryKey: ['waitlistPaused'],
    queryFn: getWaitlistPaused,
  })

  const mutation = useMutation({
    mutationFn: (newPaused: boolean) => setWaitlistPaused(newPaused),
    onSuccess: () => {
      queryClient.setQueryData(['waitlistPaused'], (old: boolean) => !old)
    },
  })

  if (isLoading) {
    return (
      <div className="h-6 w-24 bg-gray-200 animate-pulse rounded" />
    )
  }

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="text-sm font-medium text-gray-700">
        {paused ? 'Paused' : 'Resume'}
      </span>
      <button
        role="switch"
        aria-checked={paused}
        data-testid="pause-toggle"
        onClick={() => mutation.mutate(!paused)}
        className={`relative inline-flex min-h-12 w-11 items-center rounded-full transition-colors ${
          paused ? 'bg-red-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            paused ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  )
}
