# P24-M02-barbarian — регресс 2014

**Baseline «до»:** `b9bfeecb90a05037eb5b955ce883617a5762e830` (`cursor/edition-p24-m02-fighter` tip).  
**После:** ветка `cursor/edition-p24-m02-barbarian`.  
Кадры: `artifacts/p24-m02-barbarian/regression-2014/`.

## md5 — до = после

Хеши содержимого кадров совпадают (имена файлов `before-` / `after-` различаются только префиксом).

### 1440×900

| Файл (stem) | md5 до | md5 после |
| --- | --- | --- |
| create-2014-race-marker-1440.png | `9830fb7a6c0acc068819fff2aeb16b0e` | `9830fb7a6c0acc068819fff2aeb16b0e` |
| create-2014-barbarian-class-1440.png | `b1e65bf4ba7e579b4ddc2a2131d7b8c5` | `b1e65bf4ba7e579b4ddc2a2131d7b8c5` |
| sheet-2014-barbarian-1440.png | `2dd5cfcacbc5b7290a3ce5282ec49ffa` | `2dd5cfcacbc5b7290a3ce5282ec49ffa` |
| sheet-2014-barbarian-features-1440.png | `af09708ccb2916938066bd61d6b2c1fb` | `af09708ccb2916938066bd61d6b2c1fb` |
| sheet-2014-berserker-features-1440.png | `ccc229921d0b830d43e1f1b1c3aea2cd` | `ccc229921d0b830d43e1f1b1c3aea2cd` |

### 390×844

| Файл (stem) | md5 до | md5 после |
| --- | --- | --- |
| create-2014-race-marker-390.png | `593794cbc8945111beb093cf3ee71614` | `593794cbc8945111beb093cf3ee71614` |
| create-2014-barbarian-class-390.png | `1173fd047c41be637b1517b39e682785` | `1173fd047c41be637b1517b39e682785` |
| sheet-2014-barbarian-header-390.png | `a50be12143322c4a6b8064512d58ab88` | `a50be12143322c4a6b8064512d58ab88` |
| sheet-2014-barbarian-abilities-390.png | `ff5893645a2699b7f3f273608b9c9c9e` | `ff5893645a2699b7f3f273608b9c9c9e` |
| sheet-2014-barbarian-features-390.png | `0f009f1ffff8b04f92a1594907cd0d7f` | `0f009f1ffff8b04f92a1594907cd0d7f` |
| sheet-2014-berserker-features-390.png | `d9625facd57b03508949f9500d646321` | `d9625facd57b03508949f9500d646321` |

Sidecars: `before-md5-1440.txt`, `before-md5-390.txt`, `after-md5-1440.txt`, `after-md5-390.txt`.

e2e: `npm run test:e2e:p24-m02-barbarian` → regression **6 passed** (before worktree + after tip).
