import { useMemo, useState } from 'react';
import type { AbilityKey, RaceChoicesState, SkillKey } from '../types/character';
import {
  buildRaceUiFields,
  resolveAbilityOverrides,
  validateRaceChoices,
  ALL_ABILITIES,
  ABILITY_LABELS_RU,
  SKILL_DEFS,
  type RaceUiField,
} from '../data/races/choiceSchema';
import { applyRaceToCharacter } from '../data/races/applyRace';
import type { Character } from '../types/character';

type Props = {
  open: boolean;
  /** id из автокомплита (может быть родителем с подрасами) */
  selectedCatalogId: string;
  character: Character;
  onClose: () => void;
  onApply: (next: Character) => void;
};

const COMMON_LANGUAGES = [
  'Общий',
  'Дварфийский',
  'Эльфийский',
  'Гномий',
  'Полуросличий',
  'Орочий',
  'Гоблинский',
  'Драконий',
  'Великаний',
  'Гноллий',
  'Инфернальный',
  'Небесный',
  'Бездны',
  'Первичный',
  'Сильван',
  'Подземный',
  'Водяной',
];

function emptyState(): RaceChoicesState {
  return {
    choices: {},
    abilityBonuses: {},
    pickedSkills: [],
    pickedLanguages: [],
    freeText: {},
  };
}

export function RaceSetupModal({
  open,
  selectedCatalogId,
  character,
  onClose,
  onApply,
}: Props) {
  const [subraceId, setSubraceId] = useState<string | undefined>();
  const [state, setState] = useState<RaceChoicesState>(emptyState);
  const [error, setError] = useState<string | null>(null);

  const { titleRu, fields, effectiveRaceId } = useMemo(
    () => buildRaceUiFields(selectedCatalogId, subraceId),
    [selectedCatalogId, subraceId],
  );

  if (!open) return null;

  const patchState = (patch: Partial<RaceChoicesState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  const onConfirm = () => {
    const subField = fields.find((f) => f.type === 'subrace');
    if (subField && subField.type === 'subrace') {
      setError('Выберите подрасу');
      return;
    }

    const err = validateRaceChoices(fields, state);
    if (err) {
      setError(err);
      return;
    }

    const abilityOverrides = resolveAbilityOverrides(fields, state);
    const nextChoices: RaceChoicesState = {
      ...state,
      abilityBonuses: abilityOverrides,
    };

    const next = applyRaceToCharacter(character, effectiveRaceId, {
      raceChoices: nextChoices,
      abilityOverrides,
      choices: nextChoices.choices,
      replaceFeatures: true,
      addAbilityScores: false,
    });
    onApply(next);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal race-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="race-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="race-modal-title">{titleRu}</h2>
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className="modal__body race-modal__body">
          {fields.map((field) => (
            <RaceFieldWidget
              key={field.id}
              field={field}
              state={state}
              onSubrace={(id) => {
                setSubraceId(id);
                setState(emptyState());
                setError(null);
              }}
              onChange={patchState}
            />
          ))}
          {error ? <p className="race-modal__error">{error}</p> : null}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn btn--primary" onClick={onConfirm}>
            Готово
          </button>
        </footer>
      </div>
    </div>
  );
}

function RaceFieldWidget({
  field,
  state,
  onChange,
  onSubrace,
}: {
  field: RaceUiField;
  state: RaceChoicesState;
  onChange: (patch: Partial<RaceChoicesState>) => void;
  onSubrace: (id: string) => void;
}) {
  switch (field.type) {
    case 'homebrewName':
      return (
        <label className="race-modal__field">
          <span>{field.labelRu}</span>
          <input
            autoFocus
            value={state.customName ?? ''}
            onChange={(e) => onChange({ customName: e.target.value })}
            placeholder="Например: Кристаллический гном"
          />
        </label>
      );

    case 'subrace':
      return (
        <fieldset className="race-modal__field">
          <legend>{field.labelRu}</legend>
          <div className="race-modal__options">
            {field.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="btn"
                onClick={() => onSubrace(opt.id)}
              >
                {opt.labelRu}
                <small>{opt.sourceRu}</small>
              </button>
            ))}
          </div>
        </fieldset>
      );

    case 'asiFixed':
      return (
        <div className="race-modal__field">
          <span>{field.labelRu}</span>
          <p className="race-modal__fixed">
            {Object.entries(field.bonuses)
              .filter(([, v]) => v)
              .map(([k, v]) => `${v! >= 0 ? '+' : ''}${v} ${ABILITY_LABELS_RU[k as AbilityKey]}`)
              .join(' · ')}
          </p>
        </div>
      );

    case 'asiChooseTwo':
      return (
        <AsiPicker
          label={field.labelRu}
          mode="chooseTwo"
          value={state.abilityBonuses ?? {}}
          onChange={(abilityBonuses) => onChange({ abilityBonuses })}
        />
      );

    case 'asiFlexible':
      return (
        <AsiPicker
          label={field.labelRu}
          mode="flexible"
          value={state.abilityBonuses ?? {}}
          onChange={(abilityBonuses) => onChange({ abilityBonuses })}
        />
      );

    case 'asiFixedPlusChoose':
      return (
        <AsiPicker
          label={field.labelRu}
          mode="fixedPlusChoose"
          fixed={field.fixed}
          choosePlusOne={field.choosePlusOne}
          value={state.abilityBonuses ?? {}}
          onChange={(abilityBonuses) => onChange({ abilityBonuses })}
        />
      );

    case 'language':
      return (
        <LanguagePicker
          label={field.labelRu}
          count={field.count}
          value={state.pickedLanguages ?? []}
          onChange={(pickedLanguages) => onChange({ pickedLanguages })}
        />
      );

    case 'skill':
      return (
        <SkillPicker
          label={field.labelRu}
          count={field.count}
          pool={field.pool}
          value={state.pickedSkills ?? []}
          onChange={(pickedSkills) => onChange({ pickedSkills })}
        />
      );

    case 'tool':
    case 'option': {
      const need = field.type === 'tool' ? field.count : (field.count ?? 1);
      const raw = state.choices?.[field.id];
      const selected = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
      const options =
        field.type === 'tool'
          ? field.options.map((o) => ({ id: o, labelRu: o }))
          : field.options;

      return (
        <fieldset className="race-modal__field">
          <legend>
            {field.labelRu}
            {need > 1 ? ` (×${need})` : ''}
          </legend>
          <div className="race-modal__chips">
            {options.map((opt) => {
              const on = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`chip ${on ? 'chip--on' : ''}`}
                  onClick={() => {
                    let next: string[];
                    if (need === 1) {
                      next = [opt.id];
                    } else if (on) {
                      next = selected.filter((x) => x !== opt.id);
                    } else if (selected.length >= need) {
                      next = [...selected.slice(1), opt.id];
                    } else {
                      next = [...selected, opt.id];
                    }
                    onChange({
                      choices: {
                        ...state.choices,
                        [field.id]: need === 1 ? next[0]! : next,
                      },
                    });
                  }}
                >
                  {opt.labelRu}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }

    case 'freeText':
      return (
        <label className="race-modal__field">
          <span>{field.labelRu}</span>
          <input
            value={state.freeText?.[field.id] ?? ''}
            placeholder={field.placeholderRu}
            onChange={(e) =>
              onChange({
                freeText: { ...state.freeText, [field.id]: e.target.value },
              })
            }
          />
        </label>
      );

    case 'info':
      return (
        <p className="race-modal__info">
          <strong>{field.labelRu}.</strong> {field.textRu}
        </p>
      );

    default:
      return null;
  }
}

function AsiPicker({
  label,
  mode,
  value,
  onChange,
  fixed,
  choosePlusOne,
}: {
  label: string;
  mode: 'chooseTwo' | 'flexible' | 'fixedPlusChoose';
  value: Partial<Record<AbilityKey, number>>;
  onChange: (next: Partial<Record<AbilityKey, number>>) => void;
  fixed?: Partial<Record<AbilityKey, number>>;
  choosePlusOne?: number;
}) {
  const [flexiblePattern, setFlexiblePattern] = useState<'2+1' | '1+1+1'>('2+1');

  const toggle = (ability: AbilityKey) => {
    if (mode === 'chooseTwo') {
      const next = { ...value };
      if (next[ability]) {
        delete next[ability];
      } else {
        const keys = Object.keys(next) as AbilityKey[];
        if (keys.length >= 2) delete next[keys[0]!];
        next[ability] = 1;
      }
      onChange(next);
      return;
    }

    if (mode === 'fixedPlusChoose') {
      if ((fixed?.[ability] ?? 0) > 0) return;
      const next = { ...value };
      if (next[ability]) {
        delete next[ability];
      } else {
        const extras = (Object.keys(next) as AbilityKey[]).filter((k) => !(fixed?.[k] ?? 0));
        if (extras.length >= (choosePlusOne ?? 1)) delete next[extras[0]!];
        next[ability] = 1;
      }
      onChange(next);
      return;
    }

    // flexible
    const next = { ...value };
    if (flexiblePattern === '1+1+1') {
      if (next[ability]) delete next[ability];
      else {
        const keys = Object.keys(next) as AbilityKey[];
        if (keys.length >= 3) delete next[keys[0]!];
        next[ability] = 1;
      }
    } else {
      // +2 then +1
      const entries = Object.entries(next) as [AbilityKey, number][];
      const has2 = entries.find(([, v]) => v === 2);
      const has1 = entries.find(([, v]) => v === 1);
      if (next[ability] === 2) {
        delete next[ability];
      } else if (next[ability] === 1) {
        delete next[ability];
      } else if (!has2) {
        next[ability] = 2;
      } else if (!has1 && ability !== has2[0]) {
        next[ability] = 1;
      } else if (has1 && ability !== has2[0]) {
        delete next[has1[0]];
        next[ability] = 1;
      }
    }
    onChange(next);
  };

  return (
    <fieldset className="race-modal__field">
      <legend>{label}</legend>
      {mode === 'flexible' ? (
        <div className="race-modal__asi-mode">
          <button
            type="button"
            className={`chip ${flexiblePattern === '2+1' ? 'chip--on' : ''}`}
            onClick={() => {
              setFlexiblePattern('2+1');
              onChange({});
            }}
          >
            +2 / +1
          </button>
          <button
            type="button"
            className={`chip ${flexiblePattern === '1+1+1' ? 'chip--on' : ''}`}
            onClick={() => {
              setFlexiblePattern('1+1+1');
              onChange({});
            }}
          >
            +1 / +1 / +1
          </button>
        </div>
      ) : null}
      {fixed && Object.keys(fixed).length ? (
        <p className="race-modal__fixed">
          Фиксировано:{' '}
          {Object.entries(fixed)
            .filter(([, v]) => v)
            .map(([k, v]) => `${v! >= 0 ? '+' : ''}${v} ${ABILITY_LABELS_RU[k as AbilityKey]}`)
            .join(', ')}
        </p>
      ) : null}
      <div className="race-modal__chips">
        {ALL_ABILITIES.map((ability) => {
          const locked = mode === 'fixedPlusChoose' && (fixed?.[ability] ?? 0) > 0;
          const bonus = locked ? fixed![ability]! : value[ability] ?? 0;
          return (
            <button
              key={ability}
              type="button"
              disabled={locked}
              className={`chip ${bonus ? 'chip--on' : ''}`}
              onClick={() => toggle(ability)}
            >
              {ABILITY_LABELS_RU[ability]}
              {bonus ? ` +${bonus}` : ''}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function LanguagePicker({
  label,
  count,
  value,
  onChange,
}: {
  label: string;
  count: number;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const slots = Array.from({ length: count }, (_, i) => value[i] ?? '');
  return (
    <fieldset className="race-modal__field">
      <legend>{label}</legend>
      {slots.map((slot, i) => (
        <input
          key={i}
          list="race-lang-list"
          value={slot}
          placeholder="Язык"
          onChange={(e) => {
            const next = [...slots];
            next[i] = e.target.value;
            onChange(next);
          }}
        />
      ))}
      <datalist id="race-lang-list">
        {COMMON_LANGUAGES.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </fieldset>
  );
}

function SkillPicker({
  label,
  count,
  pool,
  value,
  onChange,
}: {
  label: string;
  count: number;
  pool?: SkillKey[];
  value: SkillKey[];
  onChange: (next: SkillKey[]) => void;
}) {
  const options = pool
    ? SKILL_DEFS.filter((s) => pool.includes(s.key))
    : SKILL_DEFS;

  // This picker manages a shared pickedSkills list — for multiple skill fields
  // we allow selecting up to `count` from this widget by toggling within the global list.
  // Simpler approach: treat value as the full list; this widget adds/removes up to count
  // items that belong to its pool. For single skillChoice field, count is total needed.

  return (
    <fieldset className="race-modal__field">
      <legend>
        {label} (выбрано {value.length}/{count})
      </legend>
      <div className="race-modal__chips">
        {options.map((opt) => {
          const on = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              className={`chip ${on ? 'chip--on' : ''}`}
              onClick={() => {
                if (on) onChange(value.filter((k) => k !== opt.key));
                else if (value.length >= count) onChange([...value.slice(1), opt.key]);
                else onChange([...value, opt.key]);
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
