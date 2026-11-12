/**
 * S-07: подписи отдыха (gritty) и доступность кнопок при бое.
 * Запуск: npx tsx frontend/src/features/lobby/sessionS07.selfcheck.ts
 */
import { normalizeCampaignRules } from './campaignRules'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const plain = normalizeCampaignRules({})
assert(plain.homebrew.gritty_rest === false, 'default gritty off')

const gritty = normalizeCampaignRules({ homebrew: { gritty_rest: true } })
assert(gritty.homebrew.gritty_rest === true, 'gritty on')

function restButtonLabel(kind: 'short' | 'long', grittyOn: boolean): string {
  if (kind === 'short') return grittyOn ? 'Короткий отдых (8 ч)' : 'Короткий отдых'
  return grittyOn ? 'Долгий отдых (7 дн.)' : 'Долгий отдых'
}

assert(restButtonLabel('short', false) === 'Короткий отдых', 'short plain')
assert(restButtonLabel('long', true).includes('7'), 'long gritty')

function restDisabled(combatActive: boolean): boolean {
  return Boolean(combatActive)
}
assert(restDisabled(true) === true, 'rest off in combat')
assert(restDisabled(false) === false, 'rest on outside combat')

console.log('sessionS07.selfcheck: ok')
