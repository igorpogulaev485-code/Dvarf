# P24-M02-artificer — регресс 2014 (md5)

Точка «до»: `69b5dca78c067a7ea65e201d78da02d62edd866e` (`cursor/edition-p24-m02-ranger`).

## Как снимали

```bash
# before — worktree на tip ranger
git worktree add /tmp/artificer-before 69b5dca78c067a7ea65e201d78da02d62edd866e
cd /tmp/artificer-before/frontend && npm ci
cp <branch>/frontend/playwright.p24-m02-artificer.config.ts .
cp <branch>/frontend/e2e/p24-m02-artificer-regression-2014.spec.ts e2e/
cp <branch>/frontend/e2e/support/artificer2014Mock.ts e2e/support/
P24_M02_ARTIFICER_SHOT_TAG=before npx playwright test \
  --config=playwright.p24-m02-artificer.config.ts p24-m02-artificer-regression-2014

# after — эта ветка
P24_M02_ARTIFICER_SHOT_TAG=after npm run test:e2e:p24-m02-artificer -- p24-m02-artificer-regression-2014
```

Кадры и sidecar: `artifacts/p24-m02-artificer/regression-2014/`.

## Пары md5

| Файл (пара before/after) | md5 до | md5 после | |
| --- | --- | --- | --- |
| create-2014-race-marker-1440 | `9830fb7a6c0acc068819fff2aeb16b0e` | `9830fb7a6c0acc068819fff2aeb16b0e` | OK |
| create-2014-artificer-class-1440 | `20bdf95ccbaa97c7a0d674ac301c5b9e` | `20bdf95ccbaa97c7a0d674ac301c5b9e` | OK |
| sheet-2014-artificer-1440 | `809323e23efd155cee6b96f0517cd0b7` | `809323e23efd155cee6b96f0517cd0b7` | OK |
| sheet-2014-artificer-features-1440 | `5db7def6267152c5a3ccfa69fbf9156e` | `5db7def6267152c5a3ccfa69fbf9156e` | OK |
| create-2014-race-marker-390 | `593794cbc8945111beb093cf3ee71614` | `593794cbc8945111beb093cf3ee71614` | OK |
| create-2014-artificer-class-390 | `5ee4564f0d152b3574b1be5092d8c50a` | `5ee4564f0d152b3574b1be5092d8c50a` | OK |
| sheet-2014-artificer-header-390 | `f2766913727a98c1e5eaf7b46367df82` | `4e9568e5b2b7be482839b3c05ecfb050` | DIFF (~324 px AA) |
| sheet-2014-artificer-abilities-390 | `c700cd470485a94977b57709c230fd9f` | `074a76598b71a20a371b83b5e08a3e0a` | DIFF (~729 px AA) |
| sheet-2014-artificer-features-390 | `e302f118a70a480b209e8a9e7056179a` | `fa3f72fbe9108e59613a40f00cf075a7` | DIFF (~403 px AA) |

На листах 390 по-прежнему **«Изобретатель»**, блок **«Активные инфузии»**, умения 2014 (не «Магия вещей» / не «Душа творения»). Create 390 и все пары 1440 — байт-в-байт.

**Доправка 1:** 1440 after переснят — md5 до = после без изменений. Sheet 390 не переснимали (сглаживание шрифта).
