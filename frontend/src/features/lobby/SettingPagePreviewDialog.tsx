/**
 * T3: превью страницы сеттинга поверх стола (без ухода в вики).
 */
import { useMemo } from 'react'
import type { SettingPage, SettingPageTemplate } from '../../shared/api/lobbies'
import { Button, Dialog, Stack, Text } from '../../ui'
import { SettingMentionBody } from './SettingMentionBody'
import { pageKindLabel, QUEST_STATUS_LABELS, type QuestStatus } from './settingKinds'
import { templateForPage } from './settingPages'

type Props = {
  open: boolean
  page: SettingPage | null
  pages: SettingPage[]
  templates?: SettingPageTemplate[]
  isOwner: boolean
  settingId?: string | null
  onClose: () => void
  onOpenPage?: (pageId: string) => void
  onOpenInWiki?: (pageId: string) => void
}

export function SettingPagePreviewDialog({
  open,
  page,
  pages,
  templates = [],
  isOwner,
  settingId,
  onClose,
  onOpenPage,
  onOpenInWiki,
}: Props) {
  const template = useMemo(
    () => templateForPage(templates, page),
    [templates, page],
  )
  const schemaFields = template?.schema ?? []

  return (
    <Dialog
      open={open}
      title={page?.title || 'Страница'}
      size="wide"
      primaryLabel="Закрыть"
      secondaryLabel={
        page && settingId && onOpenInWiki ? 'В вики' : undefined
      }
      onPrimary={onClose}
      onSecondary={
        page && settingId && onOpenInWiki
          ? () => onOpenInWiki(page.id)
          : onClose
      }
    >
      {page ? (
        <Stack gap={12}>
          <Text tone="muted">
            {pageKindLabel(page.page_kind)}
            {page.page_kind === 'quest' && page.quest_status
              ? ` · ${QUEST_STATUS_LABELS[page.quest_status as QuestStatus] ?? page.quest_status}`
              : ''}
            {isOwner ? (page.revealed ? ' · раскрыта' : ' · скрыта') : ''}
          </Text>
          {(page.tags ?? []).length > 0 ? (
            <div className="setting-wiki-tags__list">
              {page.tags.map((tag) => (
                <span key={tag} className="setting-wiki-tags__chip">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {schemaFields.length > 0 ? (
            <div className="setting-wiki-fields">
              {schemaFields.map((field) => {
                if (!isOwner && field.gm_only) return null
                const raw = page.fields?.[field.key]
                if (raw == null || raw === '') return null
                return (
                  <div key={field.key}>
                    <Text tone="muted">
                      {field.gm_only ? `${field.label} (мастер)` : field.label}
                    </Text>
                    <Text>{String(raw)}</Text>
                  </div>
                )
              })}
            </div>
          ) : null}
          <div>
            <Text as="h3">Текст</Text>
            <SettingMentionBody
              body={page.body}
              pages={pages}
              isOwner={isOwner}
              onOpenPage={onOpenPage}
            />
          </div>
          {isOwner && page.gm_body?.trim() ? (
            <div className="setting-wiki-gm-block">
              <Text as="h3">Заметки мастера</Text>
              <Text>{page.gm_body}</Text>
            </div>
          ) : null}
          {page && settingId && onOpenInWiki ? (
            <div className="inline-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenInWiki(page.id)}
              >
                Открыть в вики →
              </Button>
            </div>
          ) : null}
        </Stack>
      ) : (
        <Text tone="muted">Страница не найдена.</Text>
      )}
    </Dialog>
  )
}
