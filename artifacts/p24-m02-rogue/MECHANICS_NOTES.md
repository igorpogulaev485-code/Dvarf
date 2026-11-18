# P24-M02 Rogue — full vs partial

## Full (create / level-up / sheet)

- Class progression names, Sneak Attack scale, Weapon Mastery = 2 (change all)
- Expertise 2 @1 / 4 @6 (`expertise` + `expertise_6` picks)
- Reliable Talent unlock @7 (2024 catalog)
- Slippery Mind → Wis **and** Cha save proficiency (2024 create + feature grant)
- Stroke of Luck pool «Удача» @20 (reset short+long); roll history: d20→20 for any D20 Test
- Cunning Strike options (FINAL RU names) + Thief «Скрытная атака» @9
- PHB subclass picker set: Thief / Assassin / Arcane Trickster / Soulknife
- AT 2024: prepared wizard spells, **no** enchantment/illusion-only lock
- Soulknife psi table 4d6→12d12; Psychic Veil / Rend Mind pools
- Assassin: no auto-crit; Infiltration Expertise relaxes Steady Aim (moved / no speed 0)
- Thief Fast Hands 2024 (sleight / object / magic item via Cunning Action)
- `Rogue2024UseDialog` for luck / psi / veil / rend / spell thief / fast hands
- Multiclass prerequisite Dex 13

## Partial (combat automation)

- **Death Strike** — sheet calc flag + Russian summary; no mid-combat Con-save → double-damage automation
- **Envenom Weapons** — damage_rider metadata; poison condition application is table judgment
- **Thief’s Reflexes** (two turns round 1) — noted on sheet; initiative split not auto-run
- **Spell Thief** — spend pool + summary; stolen-spell storage UI not fully simulated
- **Use Magic Device** — permanent calc flags; attunement/charge floor not deeply enforced in every gear path
- **Cunning Strike / Steady Aim / Cunning Action** — turn-economy chips + dialog; full attack pipeline integration remains desk-driven
