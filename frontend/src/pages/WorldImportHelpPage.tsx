/**
 * W-API-13: справка /help/world-import — API и MCP импорта мира.
 * Только UI-кит (Panel / Stack / Text / Button / Field / Input). Без CSS-переопределений.
 */
import { useNavigate } from 'react-router-dom'
import {
  HELP_BACK,
  HELP_ERRORS,
  HELP_FREQUENT,
  HELP_INTRO,
  HELP_LIMITS,
  HELP_MCP,
  HELP_REST,
  HELP_REST_ENDPOINTS,
  HELP_REVIEW,
  HELP_TITLE,
  HELP_TOKEN,
  HELP_WAYS,
  HELP_WHO,
  apiBaseFromWindow,
  buildCurlExample,
  buildMcpClientConfig,
  mcpUrlFromWindow,
} from '../features/worldImport/helpCopy.ru'
import { Button, Field, Input, Panel, Stack, Text } from '../ui'

function CodeBlock({ children }: { children: string }) {
  return (
    <pre>
      <code>{children}</code>
    </pre>
  )
}

export function WorldImportHelpPage() {
  const navigate = useNavigate()
  const origin = apiBaseFromWindow()
  const mcpUrl = mcpUrlFromWindow()
  const curl = buildCurlExample(origin || 'https://creed20.tech')
  const mcpConfig = buildMcpClientConfig(mcpUrl)

  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/lobbies')
  }

  return (
    <main className="page page--app" data-wapi13-help>
      <Stack gap={16}>
        <div className="inline-actions">
          <Button type="button" variant="ghost" onClick={goBack}>
            {HELP_BACK}
          </Button>
        </div>

        <Text as="h1">{HELP_TITLE}</Text>

        <Panel title={HELP_INTRO.title}>
          <Stack gap={10}>
            {HELP_INTRO.body.map((p) => (
              <Text key={p.slice(0, 24)}>{p}</Text>
            ))}
          </Stack>
        </Panel>

        <Panel title={HELP_WHO.title}>
          <Stack gap={12}>
            {HELP_WHO.rows.map((row) => (
              <Stack gap={4} key={row.who}>
                <Text>
                  <strong>{row.who}</strong>
                </Text>
                <Text tone="muted">{row.what}</Text>
              </Stack>
            ))}
          </Stack>
        </Panel>

        <Panel title={HELP_WAYS.title}>
          <Stack gap={12}>
            <Text>{HELP_WAYS.lead}</Text>
            {HELP_WAYS.items.map((item) => (
              <Stack gap={4} key={item.title}>
                <Text as="h3">{item.title}</Text>
                <Text tone="muted">{item.body}</Text>
              </Stack>
            ))}
          </Stack>
        </Panel>

        <Panel title={HELP_REVIEW.title}>
          <Stack gap={8}>
            {HELP_REVIEW.steps.map((step, i) => (
              <Text key={step.slice(0, 20)}>
                {i + 1}. {step}
              </Text>
            ))}
          </Stack>
        </Panel>

        <div data-section="token">
          <Panel title={HELP_TOKEN.title}>
            <Stack gap={10}>
              {HELP_TOKEN.bullets.map((b) => (
                <Text key={b.slice(0, 24)}>{b}</Text>
              ))}
              <Text as="h3">Токен не умеет</Text>
              {HELP_TOKEN.cannot.map((c) => (
                <Text key={c} tone="muted">
                  — {c}
                </Text>
              ))}
            </Stack>
          </Panel>
        </div>

        <div data-section="rest">
          <Panel title={HELP_REST.title}>
            <Stack gap={12}>
              <Text>{HELP_REST.baseLead}</Text>
              <Field label="Базовый адрес (origin)">
                <Input value={origin || '—'} readOnly />
              </Field>
              <Text tone="muted">{HELP_REST.authHint}</Text>
              <CodeBlock>{HELP_REST.authHeader}</CodeBlock>
              <Text as="h3">Запросы</Text>
              {HELP_REST_ENDPOINTS.map((ep) => (
                <Stack gap={2} key={`${ep.method}-${ep.path}`}>
                  <Text>
                    <code>
                      {ep.method} {ep.path}
                    </code>
                  </Text>
                  <Text tone="muted">{ep.note}</Text>
                </Stack>
              ))}
              <Text as="h3">{HELP_REST.curlTitle}</Text>
              <CodeBlock>{curl}</CodeBlock>
              <Text tone="muted">{HELP_REST.idempotencyHint}</Text>
              <Text as="h3">{HELP_LIMITS.title}</Text>
              {HELP_LIMITS.items.map((item) => (
                <Text key={item.slice(0, 28)} tone="muted">
                  — {item}
                </Text>
              ))}
            </Stack>
          </Panel>
        </div>

        <div data-section="mcp" id="help-mcp">
          <Panel title={HELP_MCP.title}>
            <Stack gap={12}>
              <Text>{HELP_MCP.pathLead}</Text>
              <Field label="Адрес MCP">
                <Input value={mcpUrl} readOnly />
              </Field>
              <Text tone="warn">{HELP_MCP.notInCatalogs}</Text>
              <Text as="h3">Как подключить</Text>
              {HELP_MCP.connectOrder.map((step, i) => (
                <Text key={step.slice(0, 20)}>
                  {i + 1}. {step}
                </Text>
              ))}
              <Text as="h3">{HELP_MCP.configTitle}</Text>
              <CodeBlock>{mcpConfig}</CodeBlock>
              <Text as="h3">{HELP_MCP.toolsTitle}</Text>
              {HELP_MCP.tools.map((tool) => (
                <Stack gap={2} key={tool.name}>
                  <Text>
                    <code>{tool.name}</code>
                  </Text>
                  <Text tone="muted">{tool.desc}</Text>
                </Stack>
              ))}
            </Stack>
          </Panel>
        </div>

        <div data-section="errors">
          <Panel title={HELP_FREQUENT.title}>
            <Stack gap={10}>
              <Text>{HELP_FREQUENT.lead}</Text>
              {HELP_ERRORS.map((err) => (
                <Stack gap={2} key={err.code}>
                  <Text>
                    <code>{err.code}</code>
                  </Text>
                  <Text tone="muted">{err.when}</Text>
                </Stack>
              ))}
            </Stack>
          </Panel>
        </div>

        <div className="inline-actions">
          <Button type="button" variant="ghost" onClick={goBack}>
            {HELP_BACK}
          </Button>
        </div>
      </Stack>
    </main>
  )
}
