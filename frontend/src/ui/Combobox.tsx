import { useEffect, useId, useRef, useState } from 'react'

export type ComboboxOption = {
  id: string
  label: string
}

type ComboboxProps = {
  id?: string
  value: string
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  emptyHint?: string
  /**
   * Search text stays local until an option is chosen.
   * Blur and Escape restore `value` and do not notify the parent.
   */
  commitOnSelect?: boolean
  onChange: (value: string) => void
  onSelectOption?: (option: ComboboxOption) => void
  onQueryChange?: (query: string) => void
}

export function Combobox({
  id,
  value,
  options,
  placeholder,
  disabled,
  loading = false,
  emptyHint = 'Нет совпадений — можно оставить свой вариант',
  commitOnSelect = false,
  onChange,
  onSelectOption,
  onQueryChange,
}: ComboboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [options])

  function commitOption(option: ComboboxOption) {
    if (onSelectOption) {
      onSelectOption(option)
    } else {
      onChange(option.label)
    }
    setOpen(false)
  }

  return (
    <div className="ui-combobox" ref={rootRef}>
      <input
        id={inputId}
        className="ui-input"
        value={commitOnSelect ? draft : value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${inputId}-list`}
        aria-autocomplete="list"
        onFocus={() => {
          setOpen(true)
          onQueryChange?.(commitOnSelect ? draft : value)
        }}
        onBlur={() => {
          if (!commitOnSelect) return
          setDraft(value)
          setOpen(false)
        }}
        onChange={(event) => {
          const next = event.target.value
          if (commitOnSelect) {
            setDraft(next)
            onQueryChange?.(next)
            setOpen(true)
            return
          }
          onChange(next)
          onQueryChange?.(next)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (commitOnSelect) setDraft(value)
            setOpen(false)
            return
          }
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            setOpen(true)
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setHighlight((index) => Math.min(index + 1, Math.max(options.length - 1, 0)))
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlight((index) => Math.max(index - 1, 0))
          }
          if (event.key === 'Enter' && open && options[highlight]) {
            event.preventDefault()
            commitOption(options[highlight])
          }
        }}
      />
      {open ? (
        <ul id={`${inputId}-list`} className="ui-combobox__list" role="listbox">
          {loading ? <li className="ui-combobox__status">Ищем…</li> : null}
          {!loading && options.length === 0 ? (
            <li className="ui-combobox__status">{emptyHint}</li>
          ) : null}
          {options.map((option, index) => (
            <li key={option.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={`ui-combobox__option${index === highlight ? ' is-active' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  commitOption(option)
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
