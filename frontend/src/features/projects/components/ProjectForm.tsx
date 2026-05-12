'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  initialName?: string
  submitLabel: string
  isSubmitting?: boolean
  disabled?: boolean
  onSubmit: (values: { name: string }) => Promise<void> | void
}

export function ProjectForm({
  initialName = '',
  submitLabel,
  isSubmitting = false,
  disabled = false,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return 'Project name is required.'
    }

    if (trimmedName.length < 2) {
      return 'Project name must be at least 2 characters.'
    }

    if (trimmedName.length > 150) {
      return 'Project name must not exceed 150 characters.'
    }

    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    try {
      await onSubmit({
        name: name.trim(),
      })
    } catch {
      // Endpoint-specific errors are handled by parent components.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="project-name" className="text-sm font-medium text-gray-800">
          Project / Company Name
        </label>
        <Input
          id="project-name"
          name="name"
          type="text"
          value={name}
          disabled={disabled || isSubmitting}
          minLength={2}
          maxLength={150}
          required
          onChange={(event) => setName(event.target.value)}
          className="w-full"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={disabled || isSubmitting}
        className="w-fit"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
