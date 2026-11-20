# P24-M02-paladin — 2014 regression (create class + sheet)

**Baseline tip:** `57a970b1` (cursor/edition-p24-m02-bard)  
**Artifacts:** `/opt/cursor/artifacts/p24-m02-paladin/regression-2014/`  
**Pairs:** `before-*` vs `after-*` at 1440 and 390 (abilities column + features + create class step)

## Verdict

**All before/after pairs are byte-identical (SAME md5).** No layout, copy, or chrome drift on the 2014 create class step or the 2014 paladin sheet (header / abilities / features).

## md5

See `before-md5-{1440,390}.txt` and `after-md5-{1440,390}.txt` in the artifacts folder.  
`diff <(sed 's/before-/after-/' before-md5-390.txt) after-md5-390.txt` → empty (same for 1440).

## Reproduce

```bash
# before (worktree at 57a970b1) — see comment in p24-m02-paladin-regression-2014.spec.ts
P24_M02_PALADIN_SHOT_TAG=before npx playwright test \
  --config=playwright.p24-m02-paladin.config.ts p24-m02-paladin-regression-2014

# after (this branch)
P24_M02_PALADIN_SHOT_TAG=after npm run test:e2e:p24-m02-paladin -- p24-m02-paladin-regression-2014
```
