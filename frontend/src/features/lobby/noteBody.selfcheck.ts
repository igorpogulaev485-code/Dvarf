import { segmentNoteBody, toggleTaskAtLine } from './noteBody'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

const body = 'Перед\n- [ ] задача\n- [x] готово\nпосле'
const toggled = toggleTaskAtLine(body, 1)
assert(toggled?.includes('- [x] задача'), 'toggle on')
const toggledBack = toggleTaskAtLine(toggled!, 1)
assert(toggledBack?.includes('- [ ] задача'), 'toggle off')
assert(toggleTaskAtLine(body, 0) === null, 'non-task line')

const segs = segmentNoteBody(body)
assert(segs.some((s) => s.type === 'task' && !s.checked), 'unchecked task seg')
assert(segs.some((s) => s.type === 'task' && s.checked), 'checked task seg')

console.log('noteBody.selfcheck: ok')
