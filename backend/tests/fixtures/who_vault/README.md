# Урезанные фикстуры Who для W-API-02/03/04

Короткие копии реальных файлов из https://github.com/igorpogulaev485-code/Who
(«Эхо рассвета»). Весь репозиторий Who сюда не копируем. Upstream Who
агент не меняет.

W-API-04: `rules/encounters/gorvax_statblock_structured.json` — структурированный
фрагмент Горвакса из `01-dragonborn-vanguard.md` только для тестов (не в
продуктовый код).

`drafts/imports/qwen-fake-chat.json` — короткий фейк структуры сырого чата
(не выгрузка прода). `templates/location.md` — локальный stub шаблона.

W-API-03: `world/npcs/tandil.md`, `world/npcs/konstantin-iii.md`,
`world/npcs/maestro-kelebrim.md` — алиасы-имена и связи.

В `world/locations/lunnyy-most.md` тестовой фикстуры в шапке добавлен блок
`offices:` (безымянный → Келебрим → Тандил) — так, как мастер записал бы
смену должности в markdown любого мира. Это разметка **фикстуры**, не
канон Who.
