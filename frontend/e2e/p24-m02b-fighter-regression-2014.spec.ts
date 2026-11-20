/**
 * P24-M02B-fighter 2014 regression (1440 / 390) with md5 sidecars.
 * Full set: 5 desktop + 6 phone (create race/class + sheet + features + BM;
 * phone adds header + abilities).
 * P24_M02B_FIGHTER_SHOT_TAG=before|after
 * Artifacts: ../artifacts/p24-m02b-fighter/regression-2014/
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.P24_M02_FIGHTER_REG_DIR =
  process.env.P24_M02B_FIGHTER_REG_DIR ||
  path.resolve(here, '../../artifacts/p24-m02b-fighter/regression-2014')
process.env.P24_M02_FIGHTER_SHOT_TAG =
  process.env.P24_M02B_FIGHTER_SHOT_TAG || process.env.P24_M02_FIGHTER_SHOT_TAG || 'after'

import './p24-m02-fighter-regression-2014.spec'
