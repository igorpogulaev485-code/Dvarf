/**
 * T1: «В сеттинг» со стола — quick create с предзаполнением из противника.
 */
import { useEffect, useMemo, useState } from 'react'
import type {
  SettingPage,
  SettingPageKind,
  SettingPageTemplate,
} from '../../shared/api/lobbies'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  SETTING_PAGE_KIND_LABELS,
  SETTING_PAGE_KINDS,
} from './settingKinds'
import type { SettingHandoffDraft } from './settingHandoff'

type Props = {
  open: boolean
  busy?: boolean
  settingName?: string | null
  draft: SettingHandoffDraft | null
  templates: SettingPageTemplate[]
  pages: SettingPage[]
  onClose: () => void
  onCreate: (payload: {
    title: string
    page_kind: SettingPageKind
    template_id: string | null
    parent_id: string | null
    body: string
    gm_body: string
    tags: string[]
    fields: Record<string, string | number | boolean | null>
  }) => void
}

export function SettingTableHandoffDialog({
  open,
  busy = false,
  settingName,
  draft,
  templates,
  pages,
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState('')
  const [pageKind, setPageKind] = useState<SettingPageKind>('npc')
  const [templateId, setTemplateId] = useState('')
  const [parentId, setParentId] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!open || !draft) return
    setTitle(draft.title)
    setPageKind(draft.page_kind)
    setBody(draft.body)
    setParentId('')
    setTemplateId('')
  }, [open, draft])

  const kindTemplates = useMemo(
    () => templates.filter((t) => t.page_kind === pageKind && t.enabled),
    [templates, pageKind],
  )

  const effectiveTemplateId = useMemo(() => {
    if (templateId && kindTemplates.some((t) => t.id === templateId)) {
      return templateId
    }
    return kindTemplates[0]?.id ?? ''
  }, [templateId, kindTemplates])

  const parentOptions = useMemo(
    () =>
      [...pages]
        .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
        .map((p) => ({ id: p.id, title: p.title || 'Без названия' })),
    [pages],
  )

  const canCreate = Boolean(title.trim())

  return (
    <Dialog
      open={open}
      title="В сеттинг"
      primaryLabel="Создать страницу"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canCreate}
      onSecondary={onClose}
      onPrimary={() => {
        if (!draft || !canCreate) return
        onCreate({
          title: title.trim(),
          page_kind: pageKind,
          template_id: effectiveTemplateId || null,
          parent_id: parentId || null,
          body,
          gm_body: draft.gm_body,
          tags: draft.tags,
          fields: pageKind === 'npc' ? draft.fields : {},
        })
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          {settingName
            ? `Сохранить противника в «${settingName}» как страницу вики.`
            : 'Сохранить противника как страницу вики.'}
        </Text>
        <Field label="Имя">
          <Input
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreate && draft) {
                e.preventDefault()
                onCreate({
                  title: title.trim(),
                  page_kind: pageKind,
                  template_id: effectiveTemplateId || null,
                  parent_id: parentId || null,
                  body,
                  gm_body: draft.gm_body,
                  tags: draft.tags,
                  fields: pageKind === 'npc' ? draft.fields : {},
                })
              }
            }}
          />
        </Field>
        <Field label="Тип">
          <select
            className="ui-input"
            value={pageKind}
            disabled={busy}
            onChange={(e) => {
              setPageKind(e.target.value as SettingPageKind)
              setTemplateId('')
            }}
          >
            {SETTING_PAGE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {SETTING_PAGE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>
        {kindTemplates.length > 0 ? (
          <Field label="Шаблон">
            <select
              className="ui-input"
              value={effectiveTemplateId}
              disabled={busy}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {kindTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_system ? '' : ' (свой)'}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Родитель (опционально)">
          <select
            className="ui-input"
            value={parentId}
            disabled={busy}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Корень</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Текст" hint="Можно поправить перед созданием">
          <textarea
            className="ui-input ui-textarea"
            rows={4}
            value={body}
            disabled={busy}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        {draft?.tags?.length ? (
          <Text tone="muted">Теги: {draft.tags.map((t) => `#${t}`).join(' ')}</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
