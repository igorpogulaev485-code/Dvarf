# 2024 species without dedicated name tables

The dice on the 2024 species setup (`p24-m03-name-generate`) uses `generateRaceName`
with the species slug normalized (`elf__lfl` -> `elf`, `lorwyn-changeling` -> `lorwyn_changeling`).
These creatable 2024 species have no entry in `raceNamingTables*.ts`, so they fall back to
`GLOBAL_FANTASY_FALLBACK` (human-like given + family names):

- boggart (Боггарт)
- lupin (Волколак)
- khoravar (Кхоравар)
- faerie (Феери)
- flamekin (Огневик)
- kithkin (Свояк)
- lorwyn-changeling (Пересад Лорвина; plain `changeling` has its own table)
- rimekin (Измороз)

`elf__lfl` is not creatable (UNSUPPORTED_SPECIES_SLUGS) and resolves to `elf`.
