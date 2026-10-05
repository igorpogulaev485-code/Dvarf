import { useState } from 'react'
import type { FormEvent } from 'react'
import { login, register, type User } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, Input, Stack, Text } from '../../ui'

type EmailAuthFormProps = {
  mode: 'login' | 'register'
  onSuccess: (user: User) => void
}

export function EmailAuthForm({ mode, onSuccess }: EmailAuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    try {
      const result =
        mode === 'register'
          ? await register(email, password)
          : await login(email, password)
      onSuccess(result.user)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
      } else {
        setError('Unexpected error')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={14}>
        <Field label="Email" htmlFor={`${mode}-email`}>
          <Input
            id={`${mode}-email`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor={`${mode}-password`}
          hint={mode === 'register' ? 'Minimum 8 characters' : undefined}
        >
          <Input
            id={`${mode}-password`}
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'register' ? 8 : 1}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <Text tone="danger">{error}</Text> : null}
        <Button type="submit" disabled={pending}>
          {pending ? '...' : mode === 'register' ? 'Register' : 'Login'}
        </Button>
      </Stack>
    </form>
  )
}
