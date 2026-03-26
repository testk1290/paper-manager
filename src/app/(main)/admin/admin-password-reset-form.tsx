'use client'

import { useState } from 'react'
import { adminUpdateUserPassword } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AdminPasswordResetForm({ userId, userEmail }: { userId: string, userEmail: string }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    formData.append('userId', userId)
    setIsPending(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await adminUpdateUserPassword(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.success) {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 text-xs text-red-500 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 text-xs text-green-500 bg-green-50 rounded-md">
          Password updated successfully.
        </div>
      )}

      <div className="flex gap-2">
        <Input 
          name="newPassword" 
          type="text" 
          placeholder="New Password" 
          required 
          minLength={6}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending} variant="secondary">
          {isPending ? '...' : 'Reset'}
        </Button>
      </div>
    </form>
  )
}
