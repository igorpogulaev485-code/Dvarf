/**
 * W-04: сеты артефактов — части, пороги 2 / 3 / 4+, бонусы складываются.
 */
import { useMemo, useState } from 'react'
import type {
  ArtifactAbility,
  ArtifactSetThreshold,
  SettingArtifact,
  SettingArtifactSet,
  SettingArtifactSetCreatePayload,
} from '../../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'

type Props = {
  artifacts: SettingArtifact[]
  sets: SettingArtifactSet[]
  busy?: boolean
  onCreate: (payload: SettingArtifactSetCreatePayload) => Promise<void>
  onUpdate: (id: string, payload: SettingArtifactSetCreatePayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type Draft = {
  name: string
  description: string
  artifact_ids: string[]
  thresholds: ArtifactSetThreshold[]
}

function emptyAbility(): ArtifactAbility {
  return {
    id: crypto.randomUUID(),
    kind: 'passive',
    name: '+1 КД',
    bonus_target: 'ac',
    bonus_value: 1,
  }
}

function emptyThreshold(pieces: 2 | 3 | 4): ArtifactSetThreshold {
  return { pieces, abilities: [emptyAbility()], player_text: '' }
}

function emptyDraft(): Draft {
  return {
    name: '',
    description: '',
    artifact_ids: [],
    thresholds: [emptyThreshold(2)],
  }
}

function fromSet(s: SettingArtifactSet): Draft {
  return {
    name: s.name,
    description: s.description || '',
    artifact_ids: [...(s.artifact_ids || [])],
    thresholds:
      s.thresholds?.length > 0
        ? s.thresholds.map((t) => ({
            pieces: t.pieces,
            abilities: t.abilities?.length ? t.abilities : [emptyAbility()],
            player_text: t.player_text || '',
          }))
        : [emptyThreshold(2)],
  }
}

export function SettingArtifactSetsPanel({
  artifacts,
  sets,
  busy = false,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft())

  const sorted = useMemo(
    () => [...sets].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [sets],
  )

  const usedElsewhere = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sets) {
      if (editingId && s.id === editingId) continue
      for (const id of s.artifact_ids || []) map.set(id, s.name)
    }
    return map
  }, [sets, editingId])

  const editorOpen = creating || editingId != null
  const showT4 = draft.artifact_ids.length >= 4

  function openCreate() {
    setEditingId(null)
    setCreating(true)
    setDraft(emptyDraft())
  }

  function openEdit(s: SettingArtifactSet) {
    setCreating(false)
    setEditingId(s.id)
    setDraft(fromSet(s))
  }

  function closeEditor() {
    setCreating(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  function toggleMember(id: string) {
    setDraft((prev) => {
      const has = prev.artifact_ids.includes(id)
      const artifact_ids = has
        ? prev.artifact_ids.filter((x) => x !== id)
        : [...prev.artifact_ids, id]
      let thresholds = prev.thresholds
      if (artifact_ids.length < 4) {
        thresholds = thresholds.filter((t) => t.pieces !== 4)
      }
      return { ...prev, artifact_ids, thresholds }
    })
  }

  function ensureThreshold(pieces: 2 | 3 | 4) {
    setDraft((prev) => {
      if (prev.thresholds.some((t) => t.pieces === pieces)) return prev
      return {
        ...prev,
        thresholds: [...prev.thresholds, emptyThreshold(pieces)].sort(
          (a, b) => a.pieces - b.pieces,
        ),
      }
    })
  }

  function removeThreshold(pieces: number) {
    setDraft((prev) => ({
      ...prev,
      thresholds: prev.thresholds.filter((t) => t.pieces !== pieces),
    }))
  }

  async function save() {
    const name = draft.name.trim()
    if (!name) return
    const thresholds = draft.thresholds
      .filter((t) => t.pieces !== 4 || draft.artifact_ids.length >= 4)
      .map((t) => ({
        pieces: t.pieces,
        player_text: (t.player_text || '').trim(),
        abilities: t.abilities,
      }))
    const payload: SettingArtifactSetCreatePayload = {
      name,
      description: draft.description.trim(),
      artifact_ids: draft.artifact_ids,
      thresholds,
    }
    if (editingId) await onUpdate(editingId, payload)
    else await onCreate(payload)
    closeEditor()
  }

  return (
    <Panel title="Сеты артефактов">
      <Stack gap={14}>
        <Text tone="muted">
          Несколько частей дают бонус за 2 / 3 / 4+ надетых. Бонусы складываются: при трёх
          частях действуют и «за 2», и «за 3».
        </Text>

        {!editorOpen ? (
          <div>
            <Button type="button" variant="secondary" disabled={busy} onClick={openCreate}>
              + Сет
            </Button>
          </div>
        ) : null}

        {editorOpen ? (
          <Stack gap={12}>
            <Text as="h4">{editingId ? 'Редактировать сет' : 'Новый сет'}</Text>
            <Field label="Название">
              <Input
                value={draft.name}
                disabled={busy}
                placeholder="Сет бури"
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="Описание">
              <textarea
                className="ui-input ui-textarea"
                rows={2}
                value={draft.description}
                disabled={busy}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              />
            </Field>

            <Field label="Части сета">
              <div className="session-gen-chips" role="group" aria-label="Артефакты сета">
                {artifacts.length === 0 ? (
                  <Text tone="muted">Сначала создайте артефакты.</Text>
                ) : (
                  artifacts.map((a) => {
                    const taken = usedElsewhere.get(a.id)
                    const on = draft.artifact_ids.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`session-gen-chip${on ? ' is-on' : ''}`}
                        disabled={busy || Boolean(taken)}
                        title={taken ? `Уже в сете «${taken}»` : a.name}
                        onClick={() => toggleMember(a.id)}
                      >
                        {a.name}
                      </button>
                    )
                  })
                )}
              </div>
            </Field>

            <Stack gap={8}>
              <div className="setting-wiki__nav-head">
                <Text as="h4">Пороги</Text>
                <div className="inline-actions">
                  {!draft.thresholds.some((t) => t.pieces === 2) ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => ensureThreshold(2)}>
                      + за 2
                    </Button>
                  ) : null}
                  {!draft.thresholds.some((t) => t.pieces === 3) ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => ensureThreshold(3)}>
                      + за 3
                    </Button>
                  ) : null}
                  {showT4 && !draft.thresholds.some((t) => t.pieces === 4) ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => ensureThreshold(4)}>
                      + за 4+
                    </Button>
                  ) : null}
                </div>
              </div>

              {draft.thresholds
                .filter((t) => t.pieces !== 4 || showT4)
                .map((thr) => (
                  <div key={thr.pieces} className="setting-artifact-ability">
                    <div className="setting-artifact-ability__head">
                      <Text as="h4">За {thr.pieces === 4 ? '4+' : thr.pieces}</Text>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || draft.thresholds.length <= 1}
                        onClick={() => removeThreshold(thr.pieces)}
                      >
                        Убрать
                      </Button>
                    </div>
                    <Field label="Текст для игрока">
                      <Input
                        value={thr.player_text || ''}
                        disabled={busy}
                        placeholder="Кратко, что даёт порог"
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            thresholds: p.thresholds.map((t) =>
                              t.pieces === thr.pieces
                                ? { ...t, player_text: e.target.value }
                                : t,
                            ),
                          }))
                        }
                      />
                    </Field>
                    {(thr.abilities || []).map((ab, idx) => (
                      <div key={ab.id || idx} className="setting-artifact-editor__row">
                        <Field label="Способность">
                          <Input
                            value={ab.name || ''}
                            disabled={busy}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                thresholds: p.thresholds.map((t) => {
                                  if (t.pieces !== thr.pieces) return t
                                  const abilities = [...(t.abilities || [])]
                                  abilities[idx] = { ...abilities[idx], name: e.target.value }
                                  return { ...t, abilities }
                                }),
                              }))
                            }
                          />
                        </Field>
                        {ab.kind === 'passive' ? (
                          <Field label="Бонус КД">
                            <Input
                              type="number"
                              value={String(ab.bonus_value ?? 1)}
                              disabled={busy}
                              onChange={(e) =>
                                setDraft((p) => ({
                                  ...p,
                                  thresholds: p.thresholds.map((t) => {
                                    if (t.pieces !== thr.pieces) return t
                                    const abilities = [...(t.abilities || [])]
                                    abilities[idx] = {
                                      ...abilities[idx],
                                      kind: 'passive',
                                      bonus_target: 'ac',
                                      bonus_value: Number(e.target.value) || 0,
                                    }
                                    return { ...t, abilities }
                                  }),
                                }))
                              }
                            />
                          </Field>
                        ) : null}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          thresholds: p.thresholds.map((t) =>
                            t.pieces === thr.pieces
                              ? { ...t, abilities: [...(t.abilities || []), emptyAbility()] }
                              : t,
                          ),
                        }))
                      }
                    >
                      + Способность порога
                    </Button>
                  </div>
                ))}
            </Stack>

            <div className="inline-actions">
              <Button type="button" disabled={busy || !draft.name.trim()} onClick={() => void save()}>
                Сохранить сет
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={closeEditor}>
                Отмена
              </Button>
            </div>
          </Stack>
        ) : null}

        {sorted.length === 0 && !editorOpen ? (
          <Text tone="muted">Сетов пока нет.</Text>
        ) : (
          <ul className="setting-artifact-list">
            {sorted.map((s) => (
              <li key={s.id}>
                <div className="setting-wiki__nav-head">
                  <div>
                    <Text as="span">{s.name}</Text>
                    <Text tone="muted">
                      {' '}
                      · {(s.artifact_ids || []).length} част.
                      {(s.thresholds || []).map((t) => ` · ${t.pieces === 4 ? '4+' : t.pieces}`).join('')}
                    </Text>
                  </div>
                  <div className="inline-actions">
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => openEdit(s)}>
                      Изменить
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onDelete(s.id)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Panel>
  )
}
