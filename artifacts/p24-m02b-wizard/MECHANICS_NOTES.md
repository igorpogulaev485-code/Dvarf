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

Полный набор 5+6 (как у плута). Все пары before = after. Кадры: `artifacts/p24-m02b-wizard/regression-2014/`.

**1440 (5):** race-marker `9830fb7a…`, wizard-class `37a63f29…`, sheet-wizard `cb510c5e…`, wizard-features `5f4d9710…`, evocation-features `50d55a6c…`.

**390 (6):** race-marker `593794cb…`, wizard-class `e2463835…`, header `5f215ef6…`, abilities `91b5726b…`, wizard-features `e21e940a…`, evocation-features `7d495943…`.

Sidecar’ы: `before-md5-*` / `after-md5-*` / `md5-compare.txt`.

## Проверки (п.7 доправки)

- **«Известно» + max_prepared null:** да, дыра книжных путей — classic SpellsPanel при `max_prepared == null` считал книгу режимом Known («Известно N/freeCap»). Исправлено: spellbook mode не known; create пишет `max_prepared` для волшебника.
- **Камень «тёмное зрение 60» на дварфе 120:** `effectiveDarkvisionFt` берёт `Math.max` с buff senses — камень не затирает 120.

## AU Savant book need

L3 = 12, L5 = 17, L11 = 32 (free research + school free). Bladesinger без саванта. Live create / seed / BE / selfcheck совпадают.

## 2014 / PHB 2024

- 2014 wizard tradition / bladesong / grimoire not rewritten.
- PHB four schools keep existing pools and dialogs.
- `RULES_EDITION_2024_OPEN` remains false.
