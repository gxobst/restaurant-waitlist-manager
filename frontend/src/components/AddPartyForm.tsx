import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addParty } from '../services/index.ts'
import type { CreatePartyRequest } from '../types/index.ts'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormErrors {
  name?: string
  party_size?: string
  email?: string
}

export default function AddPartyForm() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [partySize, setPartySize] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (data: CreatePartyRequest) => addParty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      setName('')
      setPartySize('')
      setPhone('')
      setEmail('')
      setNotes('')
      setErrors({})
      setSubmitError(null)
    },
    onError: (error: Error) => {
      setSubmitError(error.message.includes('Something went wrong') ? 'Failed to add party. Please try again.' : 'Failed to add party. Please try again.')
    },
  })

  function validate(): FormErrors {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    const sizeNum = Number(partySize)
    if (!partySize) {
      newErrors.party_size = 'Party size is required'
    } else if (!Number.isInteger(sizeNum) || sizeNum < 1 || sizeNum > 12) {
      newErrors.party_size = 'Party size must be between 1 and 12'
    }

    if (email && !EMAIL_REGEX.test(email)) {
      newErrors.email = 'Invalid email format'
    }

    return newErrors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const validationErrors = validate()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    mutation.mutate({
      name: name.trim(),
      party_size: Number(partySize),
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    })
  }

  const isSubmitDisabled = !name.trim() || !partySize || mutation.isPending

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-white rounded-lg border border-gray-200">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="party_size" className="block text-sm font-medium text-gray-700 mb-1">
          Party Size *
        </label>
        <input
          type="number"
          id="party_size"
          min="1"
          max="12"
          step="1"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.party_size && <p className="mt-1 text-sm text-red-600">{errors.party_size}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          type="text"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="text"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full min-h-12 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full min-h-12 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Adding...' : 'Add Party'}
      </button>
    </form>
  )
}
