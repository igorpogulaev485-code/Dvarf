import type { SheetModel } from './minimalSheet/sheetModel'
import { CharacterAvatarControl } from './CharacterAvatarControl'
import { alignmentSheetLabel } from '../../shared/dnd/alignments'
import type { TextBlock } from './textBlocks'

const RACE_HINT =
  'Подраса и развилки — в мастере расы (в 2024 — вида); если даёт черту — мастер подскажет.'

function blockValue(blocks: TextBlock[], key: string) {
  return blocks.find((block) => block.key === key)?.value ?? ''
}

function withBlock(blocks: TextBlock[], key: string, value: string, label: string): TextBlock[] {
  if (blocks.some((block) => block.key === key)) {
    return blocks.map((block) => (block.key === key ? { ...block, value } : block))
  }
  return [
    ...blocks,
    {
      key,
      defaultLabel: label,
      customLabel: null,
      isHidden: true,
      value,
      isCustom: true,
      resourceId: null,
      parts: [{ id: key, kind: 'text', value }],
    },
  ]
}

/** Desktop «Основное» in the order of the live sheet-desktop.html dialog. */
export function DeskIdentityEtalon({ model }: { model: SheetModel }) {
  const edition2024 = model.baseCharacter.rules_edition === '2024'
  const raceLabel = edition2024 ? 'Вид' : 'Раса'
  const primary = model.primaryClass
  const subclass = model.draft.identity.subclassName?.trim()
  return (
    <div className="desk-ident form">
      <p className="section-label">Персонаж</p>
      <div className="ident-avatar-row">
        <CharacterAvatarControl
          character={model.baseCharacter}
          size="md"
          faceHint=""
          faceInteractive={false}
          uploadLabel="Сменить фото"
          clearLabel="Заглушка"
          alwaysShowClear
          onChanged={(updated) => {
            model.setBaseCharacter(updated)
            model.onSaved(updated)
          }}
        />
      </div>
      <label>
        Имя
        <input
          value={model.draft.name}
          onChange={(event) => model.setDraft((prev) => ({ ...prev, name: event.target.value }))}
        />
      </label>
      <p className="section-label">Пол</p>
      <div className="pad-row" role="group" aria-label="Пол персонажа">
        {(
          [
            ['male', 'Мужской'],
            ['female', 'Женский'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`sheet-chip${model.draft.identity.gender === key ? ' is-on' : ''}`}
            onClick={() => model.patchIdentity({ gender: key })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="section-label">Классы и уровни</p>
      <div className="ident-class-row">
        <b>{primary?.name ?? 'Класс'}</b>
        <span>
          ур. {primary?.level ?? 0}
          {subclass ? ` · ${subclass}` : ''}
        </span>
        <button
          type="button"
          className="btn"
          disabled={!primary}
          onClick={() => {
            if (!primary) return
            model.setHomebrewPicker({ classEntryId: primary.id, initialName: primary.name })
          }}
        >
          Хомбрю
        </button>
      </div>
      <div className="pad-row">
        <span className="pad-note">Сумма уровней: {model.characterLevel}</span>
        <button
          type="button"
          className="btn primary"
          disabled={model.characterLevel >= 20}
          onClick={() => {
            model.setIdentityOpen(false)
            model.setLevelUpOpen(true)
          }}
        >
          +1 уровень
        </button>
      </div>
      <p className="section-label">Настройка</p>
      <div className="chips">
        <button type="button" className="chip" onClick={() => void model.openRaceSetupFromNeedsSetup()}>
          {raceLabel}
        </button>
        <button type="button" className="chip">
          Класс
        </button>
        <button type="button" className="chip">
          Архетип
        </button>
        <button type="button" className="chip">
          Предыстория
        </button>
        <button
          type="button"
          className="chip"
          disabled={!primary}
          onClick={() => {
            if (!primary) return
            model.setHomebrewPicker({ classEntryId: primary.id, initialName: primary.name })
          }}
        >
          Хомбрю-класс
        </button>
        <button type="button" className="chip" onClick={() => model.setRaceHomebrewOpen(true)}>
          Хомбрю-раса
        </button>
        <button type="button" className="chip" onClick={() => model.setBackgroundHomebrewOpen(true)}>
          Хомбрю-предыстория
        </button>
      </div>
      <div className="pad-grid pad-grid--2">
        <label>
          {raceLabel}
          <input
            id="desk-ident-race"
            value={model.draft.raceName}
            onChange={(event) => model.setDraft((prev) => ({ ...prev, raceName: event.target.value }))}
          />
          <span className="pad-note">{RACE_HINT}</span>
        </label>
        <label>
          Предыстория
          <input
            id="desk-ident-bg"
            value={model.draft.identity.background}
            onChange={(event) => model.patchIdentity({ background: event.target.value })}
          />
        </label>
        <label>
          Мировоззрение
          <input
            value={alignmentSheetLabel(model.draft.identity)}
            onChange={(event) =>
              model.patchIdentity({ alignment: '', alignmentText: event.target.value })
            }
          />
        </label>
        <label>
          Черта от мастера
          <input
            value={blockValue(model.draft.textBlocks, 'master-feat')}
            placeholder="если мастер выдал черту"
            onChange={(event) =>
              model.setDraft((prev) => ({
                ...prev,
                textBlocks: withBlock(prev.textBlocks, 'master-feat', event.target.value, 'Черта от мастера'),
              }))
            }
          />
        </label>
      </div>
      <p className="section-label">Лист</p>
      <div className="chips">
        <button type="button" className="chip" onClick={() => model.setOwnershipOpen(true)}>
          Владения и чувства
        </button>
      </div>
      <p className="section-label">Хомбрю</p>
      <label>
        Заметка хомбрю
        <textarea
          rows={2}
          placeholder="Свои правила, только для этого листа"
          value={blockValue(model.draft.textBlocks, 'homebrew-note')}
          onChange={(event) =>
            model.setDraft((prev) => ({
              ...prev,
              textBlocks: withBlock(prev.textBlocks, 'homebrew-note', event.target.value, 'Хомбрю'),
            }))
          }
        />
      </label>
    </div>
  )
}
