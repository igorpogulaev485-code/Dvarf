# Login background · glowing forest walk

Горизонтальный тёмный лес со светящейся пыльцой (по mood рефа Pinterest).

## Файлы

| Файл | Размер | Зачем |
|------|--------|--------|
| артефакт `login-bg/login-forest-walk-2560x1440.mp4` | 2560×1440 | мастер |
| [`login-forest-walk-1920x1080.mp4`](login-forest-walk-1920x1080.mp4) | 1920×1080 | для веба / Figma |
| [`login-forest-poster.jpg`](login-forest-poster.jpg) | poster / fallback |

## Длительность

**15 секунд** — оптимум для login: достаточно «прогулки», не утомляет цикл.

Диапазон норм:
- 12 с — короче, легче файл
- 15 с — рекомендуется
- 18–20 с — если хочется очень медленный drift (тяжелее)

## Как зациклить

В ролике камера идёт **ping-pong**: вглубь леса и обратно. Последний кадр ≈ первому → стык незаметен.

HTML:
```html
<video
  autoplay
  muted
  loop
  playsinline
  poster="/brand/login-forest-poster.jpg"
  style="position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1"
>
  <source src="/brand/login-forest-walk-1920x1080.mp4" type="video/mp4" />
</video>
```

CSS-тёмный оверлей поверх (чтобы форма логина читалась):
```css
.login-scrim {
  background: linear-gradient(180deg, rgba(8,14,12,.55), rgba(8,14,12,.72));
}
```

Figma: импорт MP4 как прототип-видео / или GIF-прокси; для макета хватит poster + note «loop 15s».
