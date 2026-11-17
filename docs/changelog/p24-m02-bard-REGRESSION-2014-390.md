# P24-M02-bard — 2014 regression pixel-diff (create class, 390)

**Shot:** `create-2014-bard-class-390`  
**Artifacts:** `/opt/cursor/artifacts/p24-m02-bard/regression-2014/`  
**Pair:** `before-create-2014-bard-class-390.png` vs `after-create-2014-bard-class-390.png`  
**Diff map:** `diff-create-2014-bard-class-390.png` (regenerated after `P24_M02_BARD_SHOT_TAG=after`)

## Verdict

**DIFF is antialiasing-only.** No layout, copy, or chrome change. Safe to treat 2014 create@390 as visually unchanged for the bard slice.

## Numbers

| Metric | Value |
|--------|-------|
| Viewport | 390×844 (329 160 px) |
| Changed pixels | **12** (0.0036%) |
| Max channel Δ | **10** |
| Mean channel Δ (changed only) | **4.42** |
| Delta histogram | `{1: 7, 6: 1, 10: 4}` |

All other before/after pairs in this folder (1440 create class, race markers, sheet shots) are **byte-identical** (SAME md5).

## Why this is AA, not UI drift

1. **Tiny delta.** Every changed pixel moves by at most 10/255 on a single channel; seven of twelve differ by **1**. That matches subpixel text/edge rasterization, not a paint or spacing edit.
2. **Paired edge samples.** Ten of the twelve pixels form five vertical pairs (same `x`, `y` / `y+1`) with the classic AA pattern: a Δ=1 neighbor next to a Δ=6…10 neighbor on a soft edge (e.g. `(204,203)` Δ1 + `(204,204)` Δ10; same at x=222, 128, 70, 241).
3. **No structure change.** Bounding box of the 12 pixels spans a large empty-looking region of the class picker, but the pixels themselves are sparse speckles — not a shifted card, new label, or missing control. RGB stays in the same warm-gray band (`~148→144` / `~165→175`).
4. **Control.** Desktop `create-2014-bard-class-1440` is SAME; only the phone rasterization path flickers.

## Reproduce

```bash
cd frontend
P24_M02_BARD_SHOT_TAG=after npx playwright test \
  --config=playwright.p24-m02-bard.config.ts p24-m02-bard-regression-2014
# then compare before-* vs after-* under
# /opt/cursor/artifacts/p24-m02-bard/regression-2014/
```
