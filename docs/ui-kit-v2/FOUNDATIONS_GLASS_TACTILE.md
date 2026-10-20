# Foundations · tactile controls + hybrid glass

**Статус:** locked в черновике v2 (Keyleth × Листва).  
**База палитры:** Zephrah Spring A + refined tokens (`#2F6A42`, bg `#EEF3EE`, ginger spark).  
**Рефы (mood only):** neo-skeuomorphic controls · frosted glass panels (Mindora-like).

Доски:
- [`boards/05-controls-tactile.svg`](boards/05-controls-tactile.svg)
- [`boards/06-glass-surfaces.svg`](boards/06-glass-surfaces.svg)
- [`boards/07-hybrid-sheet-preview.svg`](boards/07-hybrid-sheet-preview.svg)

---

## 1. Решение

| Вопрос | Ответ |
|--------|-------|
| Кнопки / свитчи / чекбоксы / слайдеры как в tactile-рефе? | **Да** — raised / pressed, pill radius, мягкие тени |
| Стекло на карточках, модалках, блоках? | **Да, гибрид** — glass shell, solid vitals |

Итог: **glass chrome + solid numbers + tactile controls**.

---

## 2. Tactile controls (атомы)

### Кнопки

| State | Fill | Radius | Shadow |
|-------|------|--------|--------|
| Primary | `#2F6A42` | pill `999` / h≈52 | soft drop + лёгкий top highlight |
| Pressed | `#275A38` + inset | same | без outer raise |
| Soft / secondary | `#D9EBD9` ink `#2F6A42` | pill | soft drop |
| Disabled | `#C9D4C9` ink `#8A968A` | pill | none |
| Danger | outline `#B42318` / text red | pill | none / minimal |
| Ginger spark | `#C45A2C` | pill | soft drop — **только** XP / share / inspiration |

### Switch / checkbox / radio / chip

- Switch ON: track `#2F6A42`, thumb white.  
- Switch OFF: track `#C9D4C9`.  
- Checkbox checked: fill accent + white mark.  
- Radio selected: ring + solid dot accent.  
- Chip «Бой»: solid accent. Chip «Исслед.»: outline. Chip XP: ginger.

### Input / slider / steps

- Field: radius 16–20, focus ring `#2F6A42` 2px.  
- Slider: filled track accent, thumb white + soft border.  
- Steps: done/active = accent; pending = muted track.

**Правило:** primary всегда листва; ginger — только spark.

---

## 3. Glass surfaces (где можно)

### CSS-идея (продукт)

```css
.surface-glass {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(18px) saturate(1.1);
  -webkit-backdrop-filter: blur(18px) saturate(1.1);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(26, 36, 30, 0.10);
}
```

Opacity ориентир: **40–55%** белого + blur. Фон за стеклом должен быть «живым» (градиент / мягкая природа), иначе стекло мертвое.

### Где YES

- модалки каста / отдыха / confirm  
- карточки персонажей  
- лобби (оболочка)  
- bottom sheet на mobile  
- кабинет / оформление  

### Где CAREFUL / NO

- плотные таблицы слотов заклинаний  
- гримуары с длинным текстом  
- classic print / PDF  
- мелкий текст на низком контрасте  
- **цифры боя** (HP, КД, инициатива) — только solid soft-card внутри glass shell

---

## 4. Hybrid sheet (обязательный паттерн)

```
┌─ glass shell (blur panel) ─────────────────────┐
│  имя / класс (serif)                            │
│  ┌ solid ┐ ┌ solid ┐ ┌ solid ┐                 │
│  │  КД   │ │  HP   │ │ Иниц. │  ← opaque vitals │
│  └───────┘ └───────┘ └───────┘                 │
│  [tactile switch] [tactile switch]              │
│  [Каст] [Отмена] [Вдохновение·ginger]           │
└─────────────────────────────────────────────────┘
```

Читаемость в бою > «красивое всё стекло».

---

## 5. Do / Don’t

**Do**
- Soft glass + живой фон.  
- Solid cards для HP / КД / слотов.  
- Tactile raise/press на интерактиве.  
- Один primary на экран; ginger редко.

**Don’t**
- Фиолетовый glow / neon glass (AI-клише).  
- Стекло на всём листе целиком.  
- Flat buttons рядом с tactile switches (один язык).  
- Копировать чужой бренд/иллюстрации с рефов.

---

## 6. Следующий шаг в Figma

Страница `UI Kit v2 · Foundations · Keyleth Listva`:
1. токены цвета (из refined A)  
2. атомы с boards/05  
3. glass recipe + hybrid sheet с boards/06–07  
4. пилоты: login · desk header · lobby  
