/**
 * C5: быстрое создание страниц (одна или bulk по строкам).
 */
import { useMemo, useState } from 'react'
import type {
  SettingPageKind,
  SettingPageTemplate,
} from '../../shared/api/lobbies'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  COMBAT_PARENT_KINDS,
  SETTING_PAGE_KIND_LABELS,
  SETTING_PAGE_KINDS,
  pageKindLabel,
} from './settingKinds'

type Props = {
  open: boolean
  busy?: boolean
  templates: SettingPageTemplate[]
  parentOptions: { id: string; title: string; page_kind?: SettingPageKind }[]
  defaultParentId?: string | null
  onClose: () => void
  onCreate: (payload: {
    page_kind: SettingPageKind
    template_id: string | null
    parent_id: string | null
    titles: string[]
  }) => void
}

export function SettingQuickCreateDialog({
  open,
  busy = false,
  templates,
  parentOptions,
  defaultParentId = null,
  onClose,
  onCreate,
}: Props) {
  const [pageKind, setPageKind] = useState<SettingPageKind>('npc')
  const [templateId, setTemplateId] = useState<string>('')
  const [parentId, setParentId] = useState<string>(defaultParentId ?? '')
  const [namesText, setNamesText] = useState('')
  const [bulk, setBulk] = useState(false)

  const kindTemplates = useMemo(
    () => templates.filter((t) => t.page_kind === pageKind && t.enabled),
    [templates, pageKind],
  )

  const filteredParents = useMemo(() => {
    if (pageKind !== 'combat') return parentOptions
    return parentOptions.filter(
      (p) => p.page_kind && COMBAT_PARENT_KINDS.includes(p.page_kind),
    )
  }, [pageKind, parentOptions])

  const effectiveTemplateId = useMemo(() => {
    if (templateId && kindTemplates.some((t) => t.id === templateId)) {
      return templateId
    }
    return kindTemplates[0]?.id ?? ''
  }, [templateId, kindTemplates])

  const titles = useMemo(() => {
    if (bulk) {
      return namesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    }
    const one = namesText.trim()
    return one ? [one] : []
  }, [bulk, namesText])

  const combatNeedsParent = pageKind === 'combat'
  const canCreate =
    titles.length > 0 &&
    (Boolean(effectiveTemplateId) || pageKind === 'combat') &&
    (!combatNeedsParent || Boolean(parentId))

  function resetAndClose() {
    setNamesText('')
    setBulk(false)
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Быстрое создание"
      primaryLabel={titles.length > 1 ? `Создать ${titles.length}` : 'Создать'}
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canCreate}
      onSecondary={resetAndClose}
      onPrimary={() => {
        if (!canCreate) return
        onCreate({
          page_kind: pageKind,
          template_id: effectiveTemplateId || null,
          parent_id: parentId || null,
          titles,
        })
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Тип + шаблон → имя. В bulk — по одному имени на строку (как в Kanka Quick
          Creator).
        </Text>
        <Field label="Тип">
          <select
            className="ui-input"
            value={pageKind}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.value as SettingPageKind
              setPageKind(next)
              setTemplateId('')
              if (next === 'combat') {
                const ok = parentOptions.find(
                  (p) =>
                    p.id === parentId &&
                    p.page_kind &&
                    COMBAT_PARENT_KINDS.includes(p.page_kind),
                )
                if (!ok) setParentId('')
              }
            }}
          >
            {SETTING_PAGE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {SETTING_PAGE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Шаблон">
          <select
            className="ui-input"
            value={effectiveTemplateId}
            disabled={busy || kindTemplates.length === 0}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {kindTemplates.length === 0 ? (
              <option value="">
                {pageKind === 'combat' ? 'Системный «Бой»' : 'Нет шаблона'}
              </option>
            ) : (
              kindTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_system ? '' : ' (свой)'}
                </option>
              ))
            )}
          </select>
        </Field>
        <Field
          label={combatNeedsParent ? 'Родитель (обязательно)' : 'Родитель (опционально)'}
          hint={
            combatNeedsParent ? 'Только локация или квест' : undefined
          }
        >
          <select
            className="ui-input"
            value={parentId}
            disabled={busy}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">
              {combatNeedsParent ? 'Выбери локацию или квест' : 'Корень'}
            </option>
            {filteredParents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.page_kind
                  ? `${SETTING_PAGE_KIND_LABELS[p.page_kind]} · `
                  : ''}
                {p.title || 'Без названия'}
              </option>
            ))}
          </select>
        </Field>
        <div className="inline-actions">
          <Button
            type="button"
            variant={!bulk ? 'primary' : 'secondary'}
            disabled={busy}
            onClick={() => setBulk(false)}
          >
            Одно имя
          </Button>
          <Button
            type="button"
            variant={bulk ? 'primary' : 'secondary'}
            disabled={busy}
            onClick={() => setBulk(true)}
          >
            Список (bulk)
          </Button>
        </div>
        <Field
          label={bulk ? `Имена (${pageKindLabel(pageKind)})` : 'Имя'}
          hint={bulk ? 'Каждая строка — новая страница' : undefined}
        >
          {bulk ? (
            <textarea
              className="ui-input ui-textarea"
              rows={6}
              value={namesText}
              disabled={busy}
              placeholder={'Гаррик\nМира\nСтарый причал'}
              onChange={(e) => setNamesText(e.target.value)}
            />
          ) : (
            <Input
              value={namesText}
              disabled={busy}
              placeholder="Например: Рассветный порт"
              onChange={(e) => setNamesText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate && titles.length === 1) {
                  e.preventDefault()
                  onCreate({
                    page_kind: pageKind,
                    template_id: effectiveTemplateId || null,
                    parent_id: parentId || null,
                    titles,
                  })
                }
              }}
            />
          )}
        </Field>
      </Stack>
    </Dialog>
  )
}
