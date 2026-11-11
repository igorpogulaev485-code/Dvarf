import {
  storeTextBlockFromEditor,
  stripDvarfInternalMarkers,
  upsertMarkedTextBlock,
} from './backgroundGrants'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const raw = `<!-- dvarf-bg-bonds -->
Влиятельный враг убил дорогого мне человека.
<!-- /dvarf-bg-bonds -->`

assert(
  stripDvarfInternalMarkers(raw) ===
    'Влиятельный враг убил дорогого мне человека.',
  'strip removes bond markers',
)

assert(
  !stripDvarfInternalMarkers(raw).includes('dvarf-bg'),
  'no marker leftovers',
)

const mixed = `своё
<!-- dvarf-bg-flaws -->
жадность
<!-- /dvarf-bg-flaws -->
хвост`

assert(
  stripDvarfInternalMarkers(mixed).includes('своё') &&
    stripDvarfInternalMarkers(mixed).includes('жадность') &&
    stripDvarfInternalMarkers(mixed).includes('хвост') &&
    !stripDvarfInternalMarkers(mixed).includes('<!--'),
  'strip keeps user text around markers',
)

const feat = `<!-- dvarf:feat-traits -->\nчерта\n<!-- /dvarf:feat-traits -->`
assert(
  stripDvarfInternalMarkers(feat) === 'черта',
  'strip feat-traits colon markers',
)

const race = `<!-- dvarf-race-traits -->\nраса\n<!-- /dvarf-race-traits -->`
assert(stripDvarfInternalMarkers(race) === 'раса', 'strip race markers')

const bgFeat =
  '<!-- dvarf-background-feature -->\nумение\n<!-- /dvarf-background-feature -->'
assert(
  stripDvarfInternalMarkers(bgFeat) === 'умение',
  'strip background-feature markers',
)

const stored = storeTextBlockFromEditor(
  'bonds',
  raw,
  'Новая привязанность',
)
assert(stored.includes('<!-- dvarf-bg-bonds -->'), 'editor keeps open marker')
assert(stored.includes('<!-- /dvarf-bg-bonds -->'), 'editor keeps close marker')
assert(stored.includes('Новая привязанность'), 'editor writes new body')
assert(
  stripDvarfInternalMarkers(stored) === 'Новая привязанность',
  'stored body is visible-clean',
)

const reapply = upsertMarkedTextBlock(stored, 'bonds', 'Ещё раз')
assert(
  stripDvarfInternalMarkers(reapply) === 'Ещё раз',
  're-apply still finds markers',
)

console.log('backgroundGrants.markers.selfcheck: ok')
