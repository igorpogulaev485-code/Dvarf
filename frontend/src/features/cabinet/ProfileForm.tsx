import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { updateMe, type User } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { formatPhoneMask, isCompleteOrEmptyPhone, phoneFromApi, phoneToApi } from '../../shared/lib/phone'
import { Button, Field, Input, Stack, Text } from '../../ui'
import { AvatarEditor } from './AvatarEditor'

type ProfileFormProps = {
  user: User
  onSaved: (user: User) => void
}

export function ProfileForm({ user, onSaved }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [phone, setPhone] = useState(phoneFromApi(user.phone))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setDisplayName(user.display_name ?? '')
    setFullName(user.full_name ?? '')
    setPhone(phoneFromApi(user.phone))
  }, [user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isCompleteOrEmptyPhone(phone)) {
      setError('Укажите телефон полностью: +7 (XXX) XXX-XX-XX')
      return
    }

    let phoneApi: string | null
    try {
      phoneApi = phoneToApi(phone)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Некорректный телефон')
      return
    }

    setPending(true)
    try {
      const updated = await updateMe({
        display_name: displayName.trim() || null,
        full_name: fullName.trim() || null,
        phone: phoneApi,
      })
      onSaved(updated)
      setSuccess('Профиль сохранён')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить профиль')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={16}>
        <AvatarEditor user={user} onChanged={onSaved} />

        <Field label="Email" htmlFor="cabinet-email" hint="Смена email пока недоступна">
          <Input id="cabinet-email" value={user.email ?? ''} readOnly disabled />
        </Field>

        <Field label="Отображаемое имя" htmlFor="cabinet-display-name">
          <Input
            id="cabinet-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={128}
            autoComplete="nickname"
            placeholder="Как вас видеть в Dvarf"
          />
        </Field>

        <Field label="ФИО" htmlFor="cabinet-full-name">
          <Input
            id="cabinet-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={255}
            autoComplete="name"
            placeholder="Необязательно"
          />
        </Field>

        <Field label="Телефон" htmlFor="cabinet-phone" hint="Формат +7 (XXX) XXX-XX-XX">
          <Input
            id="cabinet-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(formatPhoneMask(event.target.value))}
            autoComplete="tel"
            placeholder="+7 (___) ___-__-__"
          />
        </Field>

        {error ? <Text tone="danger">{error}</Text> : null}
        {success ? <Text tone="success">{success}</Text> : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </Stack>
    </form>
  )
}
