# P24-C19 — файл для ручной сверки (слой 3)

Агент, собравший данные, **не** принимает слой 3. Книга **Dragon Delves** (код DDBD) на next.dnd.su / new.ttg.club по-прежнему без карточек. Решение Игоря: закрывать пачку **своим** разбором открытых английских материалов (как бастионы в C12), без копирования текста приключений.

## Объём

| Категория | Эталон CSV `book=DDBD` | Live-сид `source=ddbd` |
|-----------|------------------------:|------------------------:|
| Виды | 0 | 0 |
| Классы / подклассы | 0 | 0 |
| Предыстории | 0 | 0 |
| Черты | 0 | 0 |
| Заклинания | 0 | 0 |
| Магические предметы | 0 | 0 |
| Существа | 0 | 0 |
| **Всего** | **0** | **0** |

Новых волн в `backend/data/srd/2024/live/` **нет**. Миграция `p24c19ddbd01` только переприменяет уже зарегистрированные волны (идемпотентно).

## Вывод по открытым источникам

Согласованные свидетельства, что в книге **нет эксклюзивного каталога**:

1. [D&D Beyond — оглавление Dragon Delves](https://www.dndbeyond.com/sources/dnd/drde) — 10 приключений + «History of … Dragons»; отдельных разделов Monsters / Magic Items / Character Options нет.
2. Отчёты владельцев (в т.ч. Reddit / обзоры): «No stat blocks, new or otherwise»; «No new magic items» — только отсылки к MM 2024 и DMG.
3. Форум D&D Beyond: фильтр source=Dragon Delves показывает существ, у которых **primary source = Monster Manual**, а DDBD — вторичное появление в приключении.
4. Gaming Nexus / EN World: новых механик, монстров и предметов нет; Noble Prodigy и прочие NPC — блоки MM24.

Сюжет, карты и тексты локаций **не переносим** (план этапа и ТЗ пачки).

## Пропущено как дубль (не сидить)

Всё, что встречается в приключениях, уже есть (или должно быть) в MM24 / SRD / DMG24. Примеры фокусных драконов приключений — **именованные экземпляры** стандартных блоков MM24 (не отдельные статблоки книги):

| Приключение | Фокус | Типовой блок MM24 (не дублировать под DDBD) |
|-------------|-------|-----------------------------------------------|
| Death at Sunset | зелёный | Green Dragon Wyrmling |
| Baker’s Doesn’t | золотой | Gold Dragon Wyrmling |
| The Will of Orcus | серебряный | (young/adult) Silver Dragon |
| For Whom the Void Calls | латунный | Young Brass Dragon |
| The Dragon of Najkir | бронзовый | (adult) Bronze Dragon |
| The Forbidden Vale | красный | Young Red Dragon |
| Before the Storm | чёрный | (adult) Black Dragon |
| Shivering Death | белый | (adult) White Dragon |
| A Copper for a Song | медный | Adult Copper Dragon |
| Dragons of the Sandstone City | синий / латунный | Adult Blue / Brass Dragon |

Прочие NPC и сокровища из обзоров лута (Dust of Disappearance, Dragon Slayer, Baba Yaga’s Dancing Broom, Folding Boat, …) — карточки **DMG24 / SRD**, не DDBD. `Noble Prodigy` — строка MM24 в `creatures.csv`.

## Pending

- `text_ru_pending` / `name_ru_pending` для DDBD: **нет** (карточек нет).
- Если WotC позже опубликует эксклюзивные блоки с primary source Dragon Delves — отдельная доправка, не выдумывать сейчас.

## Источник русских имён

Не применялся: эксклюзивных карточек 0. Термины драконов/предметов — уже принятые MM24/DMG24 и `glossary_ru.csv`.

## Виды в книге

Видов (species) в Dragon Delves **нет**.
