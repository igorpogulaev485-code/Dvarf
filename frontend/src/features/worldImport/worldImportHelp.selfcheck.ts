/**
 * W-API-13 selfcheck: справка /help/world-import + ссылка из панели.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/worldImport/worldImportHelp.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import {
  HELP_ERRORS,
  HELP_MCP,
  HELP_PANEL_LINK,
  HELP_REST,
  HELP_REST_ENDPOINTS,
  HELP_TITLE,
  HELP_TOKEN,
  TOKEN_PLACEHOLDER,
  buildCurlExample,
  buildMcpClientConfig,
} from './helpCopy.ru.ts'
import { WorldImportHelpPage } from '../../pages/WorldImportHelpPage.tsx'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')

function readSrc(rel: string): string {
  return readFileSync(join(root, 'src', rel), 'utf8')
}

// --- copy invariants ---
assert.equal(HELP_TITLE, 'Импорт мира по API и MCP')
assert.equal(TOKEN_PLACEHOLDER, 'wapi_ВАШ_ТОКЕН')
assert.ok(HELP_TOKEN.title.toLowerCase().includes('токен'))
assert.ok(HELP_REST.title === 'REST')
assert.ok(HELP_MCP.title === 'MCP')
assert.equal(HELP_MCP.tools.length, 7)
assert.ok(HELP_REST_ENDPOINTS.some((e) => e.path.includes('/world-imports/validate')))
assert.ok(HELP_ERRORS.some((e) => e.code === 'rules_edition_unsupported'))
assert.ok(HELP_ERRORS.some((e) => e.code === 'confirm_ai_disabled'))

const curl = buildCurlExample('https://creed20.tech')
assert.ok(curl.includes(TOKEN_PLACEHOLDER), 'curl uses token placeholder')
assert.ok(curl.includes('Тихая гавань'), 'neutral example location')
assert.ok(!curl.includes('wapi_live'), 'no live-looking secret')
assert.ok(!/Bearer wapi_[a-zA-Z0-9]{16,}/.test(curl), 'no long real-looking token')

const mcpCfg = buildMcpClientConfig('https://creed20.tech/mcp/world-import')
assert.ok(mcpCfg.includes('/mcp/world-import'))
assert.ok(mcpCfg.includes(TOKEN_PLACEHOLDER))

const copyBlob = [
  HELP_TITLE,
  HELP_TOKEN.title,
  HELP_REST.title,
  HELP_MCP.title,
  ...HELP_MCP.tools.map((t) => t.name),
  curl,
  mcpCfg,
].join('\n')
assert.ok(!copyBlob.includes('docs/world-import'), 'copy must not point at repo docs paths')
assert.ok(!/Эхо рассвета|Кавил|Tандил|Who/i.test(copyBlob), 'no Who world names')

// --- render page (MemoryRouter) ---
const html = renderToStaticMarkup(
  createElement(MemoryRouter, { initialEntries: ['/help/world-import'] }, [
    createElement(WorldImportHelpPage, { key: 'help' }),
  ]),
)
assert.ok(html.includes(HELP_TITLE), 'rendered title')
assert.ok(html.includes('REST') || html.includes(HELP_REST.title), 'REST section')
assert.ok(html.includes('MCP'), 'MCP section')
assert.ok(html.includes('Токен'), 'token section')
assert.ok(html.includes(TOKEN_PLACEHOLDER), 'placeholder in render')
assert.ok(!html.includes('docs/world-import'), 'no docs path in render')
assert.ok(!/Bearer wapi_[a-zA-Z0-9]{20,}/.test(html), 'no real secret in render')
assert.ok(html.includes('data-section="rest"'))
assert.ok(html.includes('data-section="mcp"'))
assert.ok(html.includes('data-section="token"'))
assert.ok(html.includes('ui-code-block'), 'kit CodeBlock class on render')
assert.ok(html.includes('ui-code-block--wrap'), 'wrap overflow on help page')
assert.equal(
  (html.match(/ui-code-block--wrap/g) || []).length,
  3,
  'auth + curl + mcp config use CodeBlock wrap',
)

const pageSrc = readSrc('pages/WorldImportHelpPage.tsx')
assert.ok(pageSrc.includes('CodeBlock'), 'page imports kit CodeBlock')
assert.ok(!pageSrc.includes('function CodeBlock'), 'no local CodeBlock override')
assert.ok(!/style=\{\{/.test(pageSrc), 'no inline style overrides on help page')

const kitSrc = readSrc('ui/CodeBlock.tsx')
assert.ok(kitSrc.includes('ui-code-block--scroll'))
assert.ok(kitSrc.includes('ui-code-block--wrap'))

// --- WorldImportPanel link ---
const panelSrc = readSrc('features/lobby/WorldImportPanel.tsx')
assert.ok(panelSrc.includes('HELP_PANEL_LINK') || panelSrc.includes(HELP_PANEL_LINK))
assert.ok(panelSrc.includes("/help/world-import"))
assert.ok(!panelSrc.includes('docs/world-import.md'), 'panel must not show docs path')
assert.ok(!panelSrc.includes('docs/world-import-mcp.md'), 'panel must not show mcp docs path')

const appSrc = readSrc('App.tsx')
assert.ok(appSrc.includes('/help/world-import'), 'route registered')
assert.ok(appSrc.includes('WorldImportHelpPage'), 'page imported')

console.log('worldImportHelp.selfcheck: ok')
