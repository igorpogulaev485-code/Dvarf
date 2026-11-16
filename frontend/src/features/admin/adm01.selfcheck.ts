/**
 * ADM-01 selfcheck: каркас админки на UI-ките, без своих CSS.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/admin/adm01.selfcheck.ts
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const adminPage = read('src/pages/AdminPage.tsx')
const cabinet = read('src/pages/CabinetPage.tsx')
const app = read('src/App.tsx')
const vite = read('vite.config.ts')
const nginx = read('nginx.conf')
const api = read('src/shared/api/admin.ts')
const auth = read('src/shared/api/auth.ts')
const indexCss = read('src/index.css')
const routes = read('src/shared/lazy/routes.tsx')

assert(app.includes('path="/admin"'), 'App.tsx must route /admin')
assert(app.includes('LazyAdminPage'), 'App.tsx must lazy-load AdminPage')
assert(routes.includes('loadAdminPage'), 'lazy routes must export AdminPage')
assert(vite.includes("'/admin'"), 'vite proxy must cover /admin')
assert(nginx.includes('location /admin'), 'nginx must dual-serve /admin')
assert(api.includes('/admin/accounts'), 'admin API client lists accounts')
assert(auth.includes('is_admin'), 'auth User type exposes is_admin hint')
assert(cabinet.includes('to="/admin"'), 'cabinet links to /admin')
assert(cabinet.includes('is_admin'), 'cabinet shows link only for admin hint')
assert(adminPage.includes('Аккаунты'), 'admin UI Russian: Аккаунты')
assert(adminPage.includes('Задать пароль админки'), 'admin UI Russian password setup')
assert(
  adminPage.includes('Раздел появится в следующей пачке') ||
    adminPage.includes('AdminMetricsSection'),
  'stubs for later sections or live metrics',
)
assert(!/ADMIN_PANEL|RULES_EDITION|bootstrap/i.test(adminPage), 'no English service labels in UI')
assert(adminPage.includes("from '../ui'"), 'admin page uses kit atoms')
assert(adminPage.includes('Select'), 'narrow nav uses kit Select')
assert(adminPage.includes('SegmentedControl'), 'wide nav keeps SegmentedControl')
assert(adminPage.includes('useCompactAdminNav'), 'compact nav breakpoint without custom CSS')
assert(!adminPage.includes('.css'), 'admin page must not import custom CSS')
assert(!/admin-.*\.css|AdminPage\.css/.test(indexCss), 'index.css must not gain admin styles')

const styleFiles = readdirSync(join(root, 'src/styles'))
assert(
  !styleFiles.some((f) => /admin/i.test(f)),
  'no new admin CSS files under styles/',
)

console.log('adm01.selfcheck ok')
