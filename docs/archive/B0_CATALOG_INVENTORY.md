# B0 — инвентаризация каталогов (без вырезания)

Цель: пометить слои и происхождение. **Охват сохраняем.**  
Правила слоёв: [`KEEP_CATALOGS_PLAYBOOK.md`](KEEP_CATALOGS_PLAYBOOK.md).

Срез: tip `origin/cursor/strategic-plan-from-prod-3d0d` · 2026-10-19.

---

## 1. Сводка объёмов (файлы tip)

| Kind | Объём (order of magnitude) | Типичный `content_layer` | Provenance сейчас |
| --- | ---: | --- | --- |
| Бестиарий | **~2380** (MM 451 + VGM/MTF 268 + MPMM 258 + books 290 + adventures 1113) | `community_ref` | `ttg:*` + `external_ref` почти на всех |
| Заклинания | **~527** enriched (из них SRD≈319, PHB gap 45, XGE 95, rest books 68) | mix `srd` + `community_ref` | `external_ref` на dnd.su; prose у ~521 |
| Расы (spec) | **~118** строк (PHB 59 + MPMM 40 + setting 19) | почти всё `community_ref` | аудиты SoT = ttg/dnd.su |
| Черты | **~105** (PHB 42 + TCE 26 + XGE 5 + прочие книги) | `community_ref` (+ SRD-пересечение отдельно) | tip specs |
| Классы / features | 13 class JSON | mix | tip |
| Gear | несколько волн inserts/updates | mix `srd` + `community_ref` | tip |

> Папка на диске называется `backend/data/srd/2014/…`, но содержимое **шире SRD** (PHB gap, XGE, ttg:MM…). Имя директории не считать licenseTag.

---

## 2. Матрица слоёв (правило разметки)

| Условие | `content_layer` |
| --- | --- |
| Сущность реально есть в SRD 5.1 / 5.2.1 | `srd` |
| Официальная книга вне SRD (PHB-only spell, MM entry, MPMM race…) | `community_ref` |
| Залил пользователь | `user_import` |
| Хоумбрю | `homebrew` |

| Поле | Флаг |
| --- | --- |
| `description` / длинный текст > ~120 символов | `has_long_prose=true` |
| `external_ref.dnd_su` / source `ttg:*` | `provenance=legacy_ttg_or_dndsu` → в очереди щита 2 |
| Только числа/слоты/CR без prose | `mechanics_only` |

---

## 3. Что уже видно без полного diff

1. **Бестиарий** — максимальный `community_ref` + почти тотальный след ttg. Приоритет щита 2.
2. **Заклинания** — уже есть естественный SRD-каркас (~319) + community хвост (PHB gap, XGE…). Удобно для пилота разметки `content_layer`.
3. **Расы** — почти нет «чистого SRD-only» продукта; почти всё community_ref. Оставляем; помечаем.
4. **Имя `srd/` в пути** — технический долг нейминга, чтобы сами себя не обманывали в legal.

---

## 4. Критерий закрытия B0

- [ ] Таблица (или CSV) по всем kind: counts × `content_layer` × `has_long_prose` × `legacy_ttg_or_dndsu`
- [ ] 0 сущностей без layer
- [ ] Список файлов/пайплайнов, которые ещё ходят в ttg/dnd.su (для выключения в B2)
- [ ] Решение фазы 1 подтверждено: **ничего не вырезаем**; только tag + pack

---

## 5. Следующий микрошаг после этой сводки

1. Скрипт разметки на tip: проставить `content_layer` в JSON/миграции (или parallel tag-file).
2. Черновик текстов `/legal` под community_ref (щит 4).
3. Запрет paywall на catalog в оферте (щит 1).
