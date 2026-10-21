# Login background · лес с рефа (v4)

База = горизонтальная адаптация Pinterest-рефа.  
Анимация **v4**: параллакс 3 плана с **расхождением боков** (деревья уходят мимо камеры) + walk-bob/sway + **независимая пыльца** в 3 глубинах с сильным drift. Не чистый zoom.

## Файлы
- артефакт `login-bg/login-forest-walk-2560x1440.mp4` — мастер 2560×1440
- [`login-forest-walk-1920x1080.mp4`](login-forest-walk-1920x1080.mp4) — веб
- [`login-forest-poster.jpg`](login-forest-poster.jpg)
- [`login-forest-base-from-ref.jpg`](login-forest-base-from-ref.jpg) — статичный кадр-база

## Цикл
**16 с**, 30 fps, ping-pong вглубь↔назад.  
Пыльца: свой период = 16 с (вверх/вбок/wobble независимо от камеры) → `loop` бесшовный.

```html
<video autoplay muted loop playsinline poster="login-forest-poster.jpg"
  style="position:fixed;inset:0;width:100%;height:100%;object-fit:cover">
  <source src="login-forest-walk-1920x1080.mp4" type="video/mp4" />
</video>
```
