import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ResetPasswordForm } from '../features/auth'
import { AppShell } from '../features/shell/AppShell'
import { Button, Panel, Stack, Text } from '../ui'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token')?.trim() || '', [params])
  const [done, setDone] = useState(false)

  return (
    <AppShell section="chars" title="Новый пароль" subtitle="Вы перешли по ссылке восстановления доступа.">
      <Panel title="Смена пароля">
        {!token ? (
          <Stack gap={12}>
            <Text tone="danger">В ссылке нет токена восстановления. Запросите новую ссылку.</Text>
            <Button variant="ghost" onClick={() => navigate('/login')}>
              На вход
            </Button>
          </Stack>
        ) : (
          <Stack gap={12}>
            {done ? (
              <Stack gap={10}>
                <Text tone="success">Пароль обновлён. Можно войти с новым паролем.</Text>
                <Button onClick={() => navigate('/login')}>Перейти ко входу</Button>
              </Stack>
            ) : (
              <ResetPasswordForm
                token={token}
                onSuccess={() => setDone(true)}
                onBackToLogin={() => navigate('/login')}
              />
            )}
          </Stack>
        )}
      </Panel>
    </AppShell>
  )
}
