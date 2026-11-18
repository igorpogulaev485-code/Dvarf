# P24-M02B Wizard — mechanics notes

ТЗ: `/cursor/stores/bot/dvarf_prompts/2024/pack-P24-M02B-common.md` + `pack-P24-M02B-wizard.md` (доступны).

## Decisions from Igor (18.11.2026)

- Truncated FRHoF Bladesinger texts completed from next.dnd.su / book; playable, not «частично».
- Undead thralls UI/catalog name: **Неживые слуги**.
- Conjuration school label in UI stays **вызов**.

## Full (create / level-up / sheet / desk)

- Allowlist: five book paths in live 2024 picker (`M02B_WIZARD_BOOK_SUBCLASS_SLUGS`).
- AU Savant schools in `SCHOOL_BY_SUBCLASS_2024` (conjurer/enchanter/necromancer/transmuter).
- Pools: benign transposition / hypnotic presence / split enchantment / empowered transmutation = INT mod (min 1); names aligned (Гипнотизирующее присутствие, Камень преобразования, Неживые слуги).
- Bladesong 2024 helper (`bladesongBonuses2024`): AC, speed, Acrobatics advantage, INT attack/damage, INT concentration; +1 use on Arcane Recovery; 2014 `bladesongBonuses` untouched.
- Song of Defense: slot × 5 while song active (dialog).
- Extra Attack bladesinger: calc + combat desk hint (cantrip replace).
- Training in War and Song: martial melee extras, skill pick, equipped melee → arcane focus.
- Pending choices: orator skill, war-and-song skill, transmuter stone benefit(s).
- Always-prepared / free cast sync: find-familiar, animate-dead, alter-self, polymorph.
- Use dialog cases for book spend pools.

## Partial / owner questions

- **Безопасный перенос — обмен** and **Инстинктивное очарование — перенацеливание**: spend + dialog exist; full board target picker may still need table judgment (no silent auto-pick).
- **Мастер преобразования — «Возвращение к жизни»**: slug not auto-mapped to Оживление/Возрождение; noted in dialog for Igor.
- AU card school wording «Призыв» vs UI «вызов» — report only.

## 2014 regression md5 (tip `3fb02475` before = branch after)

| project | file | md5 |
|---|---|---|
| 1440 | create-2014-race-marker | `9830fb7a6c0acc068819fff2aeb16b0e` |
| 1440 | create-2014-wizard-class | `37a63f294b8b59d7de03a574047de04d` |
| 1440 | sheet-2014-wizard | `cb510c5e7e13ae1731218d612054549a` |
| 390 | create-2014-race-marker | `593794cbc8945111beb093cf3ee71614` |
| 390 | create-2014-wizard-class | `e24638350aed100f1e5c27a703e5f9b9` |
| 390 | sheet-2014-wizard | `f80e0b59c955c37a56c027e1901eaa07` |

Все пары before = after. Кадры: `artifacts/p24-m02b-wizard/regression-2014/`.

## 2014 / PHB 2024

- 2014 wizard tradition / bladesong / grimoire not rewritten.
- PHB four schools keep existing pools and dialogs.
- `RULES_EDITION_2024_OPEN` remains false.
