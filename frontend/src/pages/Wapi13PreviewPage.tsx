/**
 * /dev/wapi13-preview — кадры W-API-13 без бэкенда (kit only).
 * ?scene=help|panel
 * ?narrow=1 — 390 (верх + якорь MCP).
 */
import { useSearchParams } from 'react-router-dom'
import { HELP_PANEL_LINK } from '../features/worldImport/helpCopy.ru'
import { WorldImportHelpPage } from './WorldImportHelpPage'
import { Button, Field, Input, Panel, Stack, Text } from '../ui'

export function Wapi13PreviewPage() {
  const [params] = useSearchParams()
  const scene = params.get('scene') || 'help'
  const narrow = params.get('narrow') === '1'

  if (scene === 'panel') {
    return (
      <main
        className="page page--app"
        data-wapi13-preview
        data-scene="panel"
        data-narrow={narrow || undefined}
      >
        <Stack gap={16}>
          <Text tone="muted">/dev/wapi13-preview · panel · {narrow ? '390' : '1280'}</Text>
          <Panel title="Залить мир">
            <Stack gap={16}>
              <Text>
                Черновик сверки для этого сеттинга. Правила <strong>2014</strong>.
              </Text>
              <Stack gap={8}>
                <Text as="h3">Zip или файлы</Text>
                <div className="inline-actions">
                  <Button type="button" variant="secondary">
                    Загрузить zip
                  </Button>
                </div>
              </Stack>
              <Field label="Публичная git-ссылка (HTTPS)">
                <Input value="https://github.com/example/world" readOnly />
              </Field>
              <div className="inline-actions">
                <Button type="button" variant="secondary">
                  Залить по ссылке
                </Button>
              </div>
              <Stack gap={8}>
                <Text as="h3">MCP по адресу</Text>
                <Text tone="muted">
                  Инструкция: подключите клиент к адресу ниже и передайте токен импорта в заголовке
                  Authorization. В каталоги ChatGPT/Claude ничего не публикуем.
                </Text>
                <Field label="Адрес MCP">
                  <Input value="https://creed20.tech/mcp/world-import" readOnly />
                </Field>
                <div className="inline-actions">
                  <Button type="button" variant="secondary">
                    {HELP_PANEL_LINK}
                  </Button>
                </div>
              </Stack>
            </Stack>
          </Panel>
        </Stack>
      </main>
    )
  }

  return (
    <div data-wapi13-preview data-scene="help" data-narrow={narrow || undefined}>
      <WorldImportHelpPage />
    </div>
  )
}
