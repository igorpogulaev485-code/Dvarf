/** C8: пресеты подписей смысловых связей. */

export type SettingLinkPreset = {
  label: string
  reverse: string
}

export const SETTING_LINK_PRESETS: SettingLinkPreset[] = [
  { label: 'правит', reverse: 'под властью' },
  { label: 'живёт в', reverse: 'родина' },
  { label: 'член', reverse: 'включает' },
  { label: 'соперник', reverse: 'соперник' },
  { label: 'нанимает', reverse: 'нанят у' },
  { label: 'союзник', reverse: 'союзник' },
  { label: 'знает секрет', reverse: '' },
  { label: 'база гильдии', reverse: 'гильдия здесь' },
]

export function reverseLinkLabel(label: string): string {
  const text = label.trim()
  const preset = SETTING_LINK_PRESETS.find((p) => p.label === text)
  if (preset) return preset.reverse || text
  return text
}
