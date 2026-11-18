# P24-M02-fighter — регресс 2014 (md5)

Точка «до»: `fa481f44133d68b3165d832afc4c8d16564b89df` (tip artificer / #514).

## Как снимали

```bash
# before — worktree на tip artificer
git worktree add /tmp/fighter-before fa481f44133d68b3165d832afc4c8d16564b89df
cd /tmp/fighter-before/frontend && ln -sfn /path/to/branch/frontend/node_modules node_modules
cp <branch>/frontend/playwright.p24-m02-fighter.config.ts .
cp <branch>/frontend/e2e/p24-m02-fighter-regression-2014.spec.ts e2e/
cp <branch>/frontend/e2e/support/fighter2014Mock.ts e2e/support/
P24_M02_FIGHTER_SHOT_TAG=before P24_E2E_PORT=5191 npx playwright test \
  --config=playwright.p24-m02-fighter.config.ts p24-m02-fighter-regression-2014

# after — эта ветка
P24_M02_FIGHTER_SHOT_TAG=after npm run test:e2e:p24-m02-fighter -- p24-m02-fighter-regression-2014
```

Кадры и sidecar: `artifacts/p24-m02-fighter/regression-2014/`.

## Пары md5

| Файл (пара before/after) | md5 до | md5 после | |
| --- | --- | --- | --- |
| create-2014-race-marker-1440 | `9830fb7a6c0acc068819fff2aeb16b0e` | `9830fb7a6c0acc068819fff2aeb16b0e` | OK |
| create-2014-fighter-class-1440 | `29f8f6fdd8c936c38262d259590389a8` | `29f8f6fdd8c936c38262d259590389a8` | OK |
| sheet-2014-fighter-1440 | `95fbd74028a25984ec051a5c2411f79f` | `95fbd74028a25984ec051a5c2411f79f` | OK |
| sheet-2014-fighter-features-1440 | `da40e0146d42df8ba30df376f076d8cc` | `da40e0146d42df8ba30df376f076d8cc` | OK |
| sheet-2014-battlemaster-features-1440 | `78ef4b360711c78f5bf4b6c6bd86ad57` | `78ef4b360711c78f5bf4b6c6bd86ad57` | OK |
| create-2014-race-marker-390 | `593794cbc8945111beb093cf3ee71614` | `593794cbc8945111beb093cf3ee71614` | OK |
| create-2014-fighter-class-390 | `323074c5c94353d9d9d5621e260800a2` | `323074c5c94353d9d9d5621e260800a2` | OK |
| sheet-2014-fighter-header-390 | `db4db4bd84985a9d56f361ab9d1eac15` | `db4db4bd84985a9d56f361ab9d1eac15` | OK |
| sheet-2014-fighter-abilities-390 | `d2c3b7f8b8ca05904a702d8bc49bc822` | `d2c3b7f8b8ca05904a702d8bc49bc822` | OK |
| sheet-2014-fighter-features-390 | `7daafabe57b6856ee96dc936112cc219` | `7daafabe57b6856ee96dc936112cc219` | OK |
| sheet-2014-battlemaster-features-390 | `35115387ef377a0a8778d5c62d03581e` | `35115387ef377a0a8778d5c62d03581e` | OK |

**Все пары 1440 и 390: md5 до = после.** На листах 2014 остаются «Воин», «Боевой архетип», «Второе дыхание» (1×), «Выживший» (Чемпион), BM Tasha-манёвры; без «Тактическое мышление» / «Вызов смерти».
