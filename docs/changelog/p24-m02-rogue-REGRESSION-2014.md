# P24-M02-rogue — регресс 2014

**Baseline «до»:** `fa498adbe400c6d3b1dd518092bb9666ad010913` (`cursor/edition-p24-m02-barbarian` tip).  
**После:** ветка `cursor/edition-p24-m02-rogue`.  
Кадры: `artifacts/p24-m02-rogue/regression-2014/`.

## Как снимали

```bash
# before — worktree на tip barbarian (до пачки rogue)
git worktree add /tmp/rogue-before fa498adbe400c6d3b1dd518092bb9666ad010913
cd /tmp/rogue-before/frontend && ln -sfn <branch>/frontend/node_modules node_modules
cp <branch>/frontend/playwright.p24-m02-rogue.config.ts .
cp <branch>/frontend/e2e/p24-m02-rogue-regression-2014.spec.ts e2e/
cp <branch>/frontend/e2e/support/rogue2014Mock.ts e2e/support/
P24_M02_ROGUE_SHOT_TAG=before \
P24_M02_ROGUE_REG_DIR=<repo>/artifacts/p24-m02-rogue/regression-2014 \
P24_E2E_PORT=5194 npx playwright test \
  --config=playwright.p24-m02-rogue.config.ts p24-m02-rogue-regression-2014

# after — эта ветка
P24_M02_ROGUE_SHOT_TAG=after npm run test:e2e:p24-m02-rogue -- p24-m02-rogue-regression-2014
```

## md5 — до = после

Хеши содержимого кадров совпадают (имена файлов `before-` / `after-` различаются только префиксом).

### 1440×900

| Файл (stem) | md5 до | md5 после |
| --- | --- | --- |
| create-2014-race-marker-1440.png | `9830fb7a6c0acc068819fff2aeb16b0e` | `9830fb7a6c0acc068819fff2aeb16b0e` |
| create-2014-rogue-class-1440.png | `c6e2b150cc76a60544407f69cb8b92c1` | `c6e2b150cc76a60544407f69cb8b92c1` |
| sheet-2014-rogue-1440.png | `ab102b685a25912f8ad3f4d98692201e` | `ab102b685a25912f8ad3f4d98692201e` |
| sheet-2014-rogue-features-1440.png | `b0893248a87147a48bf5837a88842e11` | `b0893248a87147a48bf5837a88842e11` |
| sheet-2014-assassin-features-1440.png | `a5378c3f735b6d0ba6f47d7e39f89f06` | `a5378c3f735b6d0ba6f47d7e39f89f06` |

### 390×844

| Файл (stem) | md5 до | md5 после |
| --- | --- | --- |
| create-2014-race-marker-390.png | `593794cbc8945111beb093cf3ee71614` | `593794cbc8945111beb093cf3ee71614` |
| create-2014-rogue-class-390.png | `f81359a1f771c507d0baab41b50e9651` | `f81359a1f771c507d0baab41b50e9651` |
| sheet-2014-rogue-header-390.png | `eeda9a80896263106c6995e3f6742134` | `eeda9a80896263106c6995e3f6742134` |
| sheet-2014-rogue-abilities-390.png | `361a3ff19807d3c8663ed14af09d5c36` | `361a3ff19807d3c8663ed14af09d5c36` |
| sheet-2014-rogue-features-390.png | `1c2d37c0b36a9cbc08acca9f9fdc20ca` | `1c2d37c0b36a9cbc08acca9f9fdc20ca` |
| sheet-2014-assassin-features-390.png | `84a63b1a2ff77dbfc319c08568bcfb94` | `84a63b1a2ff77dbfc319c08568bcfb94` |

Sidecars: `before-md5-1440.txt`, `before-md5-390.txt`, `after-md5-1440.txt`, `after-md5-390.txt`.

e2e: `npm run test:e2e:p24-m02-rogue` → regression **6 passed** (before worktree + after tip); live **18 passed** × desktop-1440 + phone-390 (create-at-1/5/11/20, AT@5 spells, assassin chip, levelup/rollback, mocks). md5 1440/390: до = после (хеши в таблице выше).
