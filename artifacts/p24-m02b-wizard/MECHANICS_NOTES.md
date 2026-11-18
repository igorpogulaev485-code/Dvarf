# P24-M02B Wizard — mechanics notes

## Decisions from Igor (18.11.2026)

- Truncated FRHoF Bladesinger texts completed from next.dnd.su / book; playable, not «частично».
- Undead thralls UI/catalog name: **Неживые слуги**.
- Conjuration school label in UI stays **вызов**.

## Full (create / level-up / sheet / desk)

- Allowlist: five book paths in live 2024 picker (`M02B_WIZARD_BOOK_SUBCLASS_SLUGS`).
- AU Savant schools in `SCHOOL_BY_SUBCLASS_2024` (conjurer/enchanter/necromancer/transmuter).
- Pools: benign transposition / hypnotic presence / split enchantment / empowered transmutation = INT mod (min 1); names aligned (Гипнотизирующее присутствие, Камень преобразования, Неживые слуги).
- Bladesong 2024 helper (`bladesongBonuses2024`): AC, speed, Acrobatics advantage, INT attack/damage, INT concentration; +1 use on Arcane Recovery; 2014 `bladesongBonuses` untouched.
- Song of Defense: slot × 5 while song active.
- Extra Attack bladesinger: calc flag for cantrip replacement.
- Pending choices: orator skill, war-and-song skill, transmuter stone benefit(s).
- Always-prepared / free cast sync: find-familiar, animate-dead, alter-self, polymorph.
- Use dialog cases for book spend pools.

## Partial / owner questions

- **Безопасный перенос — обмен** and **Инстинктивное очарование — перенацеливание**: spend + dialog exist; full board target picker may still need table judgment (no silent auto-pick).
- **Мастер преобразования — «Возвращение к жизни»**: slug not auto-mapped to Оживление/Возрождение; noted in dialog for Igor.
- AU card school wording «Призыв» vs UI «вызов» — report only.

## 2014 / PHB 2024

- 2014 wizard tradition / bladesong / grimoire not rewritten.
- PHB four schools keep existing pools and dialogs.
