import { Stack, Text, ToggleChip } from '../../ui'

type PickChipGroupProps = {
  label: string
  hint?: string
  options: Array<{ id: string; label: string; rest?: string }>
  selected: string[]
  max: number
  onChange: (next: string[]) => void
  multi?: boolean
}

/** Multi/single select chips for class skills, languages, mastery, etc. */
export function PickChipGroup({
  label,
  hint,
  options,
  selected,
  max,
  onChange,
  multi = true,
}: PickChipGroupProps) {
  function toggle(id: string) {
    if (!multi || max <= 1) {
      onChange(selected.includes(id) ? [] : [id])
      return
    }
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
      return
    }
    if (selected.length >= max) {
      onChange([...selected.slice(1), id])
      return
    }
    onChange([...selected, id])
  }

  return (
    <Stack gap={8}>
      <Text as="h3" className="create-pipeline__section-title">
        {label}
        {max > 0 ? ` (${selected.length}/${max})` : null}
      </Text>
      {hint ? <Text tone="muted">{hint}</Text> : null}
      <div role="group" aria-label={label}>
        <Stack gap={8}>
          {options.map((opt) => (
            <ToggleChip
              key={opt.id}
              main={opt.label}
              rest={opt.rest}
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
              data-testid={`p24-m03-pick-${opt.id}`}
            />
          ))}
        </Stack>
      </div>
    </Stack>
  )
}
