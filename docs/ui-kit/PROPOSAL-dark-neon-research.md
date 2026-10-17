# Неон на тёмном chrome — исследование (3 школы)

**Статус:** эскиз для сравнения. Код не трогаем.  
Доска: [`boards/dvarf-ui-kit-dark-chrome-compare-neon-STU.jpg`](boards/dvarf-ui-kit-dark-chrome-compare-neon-STU.jpg)

## Что говорит мировая практика

Общий консенсус (Neon UI palette guides, Neonflux, Nocturne/Cyberpunk systems, accessibility DS):

1. **Неон — акцент, не фон.** Charcoal/near-black surfaces; body text — нейтральный светло-серый.
2. **Один hero-neon** (иногда +1 secondary). Больше трёх светящихся оттенков = шум.
3. **Неон не для абзацев.** Только короткие labels, CTA, focus, active, status.
4. **Glow дозированно.** На CTA/focus; не под каждым текстом и не как единственный индикатор состояния.
5. **Контраст.** Многие неоны проваливают AA на мелком тексте — проверять отдельно.

## Три школы на доске

| id | Школа | Суть | Рядом с пергаментным листом |
|----|-------|------|-----------------------------|
| **S** | Signal neon | 1 hero-neon на CTA/active/focus; UI иначе нейтральный | Самый реалистичный компромисс |
| **T** | Twin-sign cyberpunk | Magenta primary + cyan secondary (классика Night City) | Громко; сильный жанровый сдвиг |
| **U** | HUD / one light | Один «источник света» (часто жёлтый Nocturne); elevation через glow | Игровой HUD; далеко от кита Листвы |

## Рекомендация для Dvarf

Если когда-нибудь понадобится неон — только **S** как опциональный «ночной игровой» режим поверх выбранного dark chrome.  
**T/U** — отдельный visual identity, почти другой продукт рядом с классическим бланком.

Источники школ: product neon guides (1 hero), CSS Crème / cyberpunk dual-sign, Nocturne «one light source».
