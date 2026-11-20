/**
 * P24-M02B-rogue 2014 regression (1440 / 390) with md5 sidecars.
 * Full set: 5 desktop + 6 phone via the PHB rogue 2014 suite.
 * P24_M02B_ROGUE_SHOT_TAG=before|after
 * Artifacts: ../artifacts/p24-m02b-rogue/regression-2014/
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.P24_M02_ROGUE_REG_DIR =
  process.env.P24_M02B_ROGUE_REG_DIR ||
  path.resolve(here, '../../artifacts/p24-m02b-rogue/regression-2014')
process.env.P24_M02_ROGUE_SHOT_TAG =
  process.env.P24_M02B_ROGUE_SHOT_TAG || process.env.P24_M02_ROGUE_SHOT_TAG || 'after'

fs.mkdirSync(process.env.P24_M02_ROGUE_REG_DIR, { recursive: true })

import './p24-m02-rogue-regression-2014.spec'
