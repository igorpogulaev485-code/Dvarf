---
name: dvarf-ui-kit-mobile
description: Mobile (<960px) UI contract for Dvarf — Bottom Scene Nav, one-panel, vitals/hot parity with Wave A. Use for any phone layout work. Desktop kit stays untouched.
---

# Dvarf Mobile UI Kit — skill для агентов

## Когда читать

Любая работа, которая меняет UI при `width < 960` / `!isPlayDesk`: play desk, pads, create, list, lobby, cabinet на телефоне.

Сначала: [`docs/ui-kit-mobile/README.md`](../../../docs/ui-kit-mobile/README.md)  
План: [`docs/redesign/MOBILE_REDESIGN_PLAN.md`](../../../docs/redesign/MOBILE_REDESIGN_PLAN.md)  
Паритет: [`docs/ui-kit-mobile/PARITY.md`](../../../docs/ui-kit-mobile/PARITY.md)

Десктопный кит ([`docs/ui-kit/README.md`](../../../docs/ui-kit/README.md) + skill `dvarf-ui-kit`) — **наследование токенов**. **Не** редактировать desktop kit «под мобилку».

## Жёсткие правила

1. Токены/шрифты/иконки/accent/ability identity — из desktop kit.
2. На `<960`: **одна сцена**, Bottom Scene Nav, не стек всех панелей.
3. Rest / Conditions / Coins / Conc-on-damage / Identity / Ownership — достижимы (vitals / HotStrip / sheets).
4. Pads = bottom sheets; ownership ≠ left drawer на телефоне.
5. Tap ≥ `--tap-min` (44px). Safe-area на nav.
6. Логика (HP/slots/spend/autosave) не менять без отдельного ok.
7. Новый мобильный паттерн → запись в mobile kit → ok Игоря → код.
8. Plan → ok → code (`dvarf-dev-workflow`). Ветка от **prod tip**.

## Запрещено

- Править/удалять `docs/ui-kit/**` ради мобилки.
- Возвращать dual select «режим + панель».
- Прятать Wave A функции за `isPlayDesk` без mobile entry.
- Параллельная палитра / purple-glow / Inter-only.

## Smoke после слайса

- 390px: K2 one-zone, K3 HP, K6 Rest, K7 attack.
- ≥1280: Wave A desk без регрессии.
- `./deploy/preflight-prod.sh` если слайс на tip.
