# P24-M02-ranger — 2014 regression (create class + sheet)

**Baseline tip:** `9508fe86a3329accfb6873dd8b23eeab5f027d6a`  
**Artifacts:** `artifacts/p24-m02-ranger/regression-2014/`  
**Pairs:** `before-*` vs `after-*` at 1440 and 390 (create class step + sheet header / abilities / features)

## Reproduce

```bash
# before (worktree at baseline tip)
git worktree add /tmp/ranger-before 9508fe86a3329accfb6873dd8b23eeab5f027d6a
cd /tmp/ranger-before/frontend && npm ci
cp <this-branch>/frontend/playwright.p24-m02-ranger.config.ts .
cp <this-branch>/frontend/e2e/p24-m02-ranger-regression-2014.spec.ts e2e/
cp <this-branch>/frontend/e2e/support/ranger2014Mock.ts e2e/support/
P24_M02_RANGER_SHOT_TAG=before npx playwright test \
  --config=playwright.p24-m02-ranger.config.ts p24-m02-ranger-regression-2014

# after (this branch)
P24_M02_RANGER_SHOT_TAG=after npm run test:e2e:p24-m02-ranger -- p24-m02-ranger-regression-2014
```

Compare `before-md5-{1440,390}.txt` with `after-md5-{1440,390}.txt` in the regression folder.