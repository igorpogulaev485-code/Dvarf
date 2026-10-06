import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ResetPasswordForm } from '../features/auth'
import { Button, Panel, Stack, Text } from '../ui'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token')?.trim() || '', [params])
  const [done, setDone] = useState(false)

  return (
    <main className="page page--auth-debug">
      <Stack gap={20}>
        <Stack gap={6}>
          <Text as="h1">Новый пароль</Text>
          <Text tone="muted">Вы перешли по ссылке восстановления доступа.</Text>
        </Stack>

        <Panel title="Смена пароля">
          {!token ? (
            <Stack gap={12}>
              <Text tone="danger">В ссылке нет токена восстановления. Запросите новую ссылку.</Text>
              <Button variant="ghost" onClick={() => navigate('/')}>
                На главную
              </Button>
            </Stack>
          ) : (
            <Stack gap={12}>
              {done ? (
                <Stack gap={10}>
                  <Text tone="success">Пароль обновлён. Можно войти с новым паролем.</Text>
                  <Button onClick={() => navigate('/')}>Перейти ко входу</Button>
                </Stack>
              ) : (
                <ResetPasswordForm
                  token={token}
                  onSuccess={() => setDone(true)}
                  onBackToLogin={() => navigate('/')}
                />
              )}
            </Stack>
          )}
        </Panel>
      </Stack>
    </main>
  )
}
