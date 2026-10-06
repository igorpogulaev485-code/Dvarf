import {
  ABILITY_LABELS_RU,
  SKILL_DEFS,
  abilityModifier,
  formatMod,
  type AbilityKey,
  type Character,
  type SkillKey,
} from '../../types/character';
import { ExpandingField } from '../../components/ExpandingField';
import { RaceField } from '../../components/RaceField';

type Props = {
  character: Character;
  onChange: (next: Character) => void;
};

function Bubble({ filled }: { filled: boolean }) {
  return <span className={`bubble ${filled ? 'bubble--filled' : ''}`} aria-hidden />;
}

export function Sheet2014Page1({ character: c, onChange }: Props) {
  const set = (patch: Partial<Character>) => onChange({ ...c, ...patch });

  const skillBonus = (key: SkillKey, ability: AbilityKey) => {
    const mod = abilityModifier(c.abilities[ability]);
    const proficient = c.skillProficiencies.includes(key);
    const expertise = c.skillExpertises?.includes(key);
    const bonus = mod + (expertise ? c.proficiencyBonus * 2 : proficient ? c.proficiencyBonus : 0);
    return formatMod(bonus);
  };

  const saveBonus = (ability: AbilityKey) => {
    const mod = abilityModifier(c.abilities[ability]);
    const proficient = c.savingThrowProficiencies.includes(ability);
    return formatMod(mod + (proficient ? c.proficiencyBonus : 0));
  };

  const passivePerception =
    10 +
    abilityModifier(c.abilities.wisdom) +
    (c.skillProficiencies.includes('perception') ? c.proficiencyBonus : 0) +
    (c.skillExpertises?.includes('perception') ? c.proficiencyBonus : 0);

  return (
    <article className="sheet sheet-2014 sheet-2014--page1" aria-label="Лист персонажа 2014, страница 1">
      <header className="sheet-2014__header">
        <div className="sheet-2014__brand">
          <div className="sheet-2014__brand-mark">D&amp;D</div>
          <div className="sheet-2014__brand-sub">5e · 2014</div>
        </div>
        <label className="sheet-2014__name-banner">
          <span>Имя персонажа</span>
          <input value={c.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="sheet-2014__meta">
          <label>
            <span>Класс и уровень</span>
            <input value={c.classAndLevel} onChange={(e) => set({ classAndLevel: e.target.value })} />
          </label>
          <label>
            <span>Предыстория</span>
            <input value={c.background} onChange={(e) => set({ background: e.target.value })} />
          </label>
          <label>
            <span>Имя игрока</span>
            <input value={c.playerName} onChange={(e) => set({ playerName: e.target.value })} />
          </label>
          <label className="sheet-2014__race-label">
            <span>Раса</span>
            <RaceField character={c} onChange={onChange} compact />
          </label>
          <label>
            <span>Мировоззрение</span>
            <input value={c.alignment} onChange={(e) => set({ alignment: e.target.value })} />
          </label>
          <label>
            <span>Опыт</span>
            <input value={c.experiencePoints} onChange={(e) => set({ experiencePoints: e.target.value })} />
          </label>
        </div>
      </header>

      <div className="sheet-2014__body">
        <div className="sheet-2014__col sheet-2014__col--left">
          <div className="sheet-2014__abilities-wrap">
            <div className="sheet-2014__abilities">
              {(Object.keys(ABILITY_LABELS_RU) as AbilityKey[]).map((key) => (
                <div className="ability-block" key={key}>
                  <div className="ability-block__label">{ABILITY_LABELS_RU[key]}</div>
                  <input
                    className="ability-block__score"
                    type="number"
                    value={c.abilities[key]}
                    onChange={(e) =>
                      set({
                        abilities: { ...c.abilities, [key]: Number(e.target.value) || 0 },
                      })
                    }
                  />
                  <div className="ability-block__mod">{formatMod(abilityModifier(c.abilities[key]))}</div>
                </div>
              ))}
            </div>

            <div className="sheet-2014__left-side">
              <label className="insp-row">
                <input
                  type="checkbox"
                  checked={c.inspiration}
                  onChange={(e) => set({ inspiration: e.target.checked })}
                />
                <span>Вдохновение</span>
              </label>
              <div className="prof-bonus">
                <input
                  type="number"
                  value={c.proficiencyBonus}
                  onChange={(e) => set({ proficiencyBonus: Number(e.target.value) || 0 })}
                />
                <span>Бонус владения</span>
              </div>

              <section className="panel saves-panel">
                {(Object.keys(ABILITY_LABELS_RU) as AbilityKey[]).map((key) => (
                  <label className="check-row" key={key}>
                    <button
                      type="button"
                      className="bubble-btn"
                      onClick={() => {
                        const has = c.savingThrowProficiencies.includes(key);
                        set({
                          savingThrowProficiencies: has
                            ? c.savingThrowProficiencies.filter((x) => x !== key)
                            : [...c.savingThrowProficiencies, key],
                        });
                      }}
                    >
                      <Bubble filled={c.savingThrowProficiencies.includes(key)} />
                    </button>
                    <span className="check-row__value">{saveBonus(key)}</span>
                    <span className="check-row__label">{ABILITY_LABELS_RU[key]}</span>
                  </label>
                ))}
                <div className="panel__caption">Спасброски</div>
              </section>

              <section className="panel skills-panel">
                {SKILL_DEFS.map((skill) => (
                  <label className="check-row" key={skill.key}>
                    <button
                      type="button"
                      className="bubble-btn"
                      onClick={() => {
                        const has = c.skillProficiencies.includes(skill.key);
                        set({
                          skillProficiencies: has
                            ? c.skillProficiencies.filter((x) => x !== skill.key)
                            : [...c.skillProficiencies, skill.key],
                        });
                      }}
                    >
                      <Bubble filled={c.skillProficiencies.includes(skill.key)} />
                    </button>
                    <span className="check-row__value">{skillBonus(skill.key, skill.ability)}</span>
                    <span className="check-row__label">
                      {skill.label}{' '}
                      <em>({ABILITY_LABELS_RU[skill.ability].slice(0, 3).toLowerCase()})</em>
                    </span>
                  </label>
                ))}
                <div className="panel__caption">Навыки</div>
              </section>
            </div>
          </div>

          <div className="passive-box">
            <strong>{passivePerception}</strong>
            <span>Пассивная мудрость (Восприятие)</span>
          </div>

          <section className="panel tall-panel">
            <ExpandingField
              aria-label="Прочие владения и языки"
              value={c.otherProficienciesAndLanguages}
              printMaxHeight="9.2rem"
              onChange={(otherProficienciesAndLanguages) => set({ otherProficienciesAndLanguages })}
            />
            <div className="panel__caption">Прочие владения и языки</div>
          </section>
        </div>

        <div className="sheet-2014__col sheet-2014__col--mid">
          <div className="combat-row">
            <div className="combat-stat combat-stat--ac">
              <input value={c.armorClass} onChange={(e) => set({ armorClass: e.target.value })} />
              <span>Класс доспеха</span>
            </div>
            <div className="combat-stat">
              <input value={c.initiative} onChange={(e) => set({ initiative: e.target.value })} />
              <span>Инициатива</span>
            </div>
            <div className="combat-stat">
              <input value={c.speed} onChange={(e) => set({ speed: e.target.value })} />
              <span>Скорость</span>
            </div>
          </div>

          <section className="panel hp-panel">
            <label className="hp-max">
              Максимум хитов
              <input value={c.hitPointMax} onChange={(e) => set({ hitPointMax: e.target.value })} />
            </label>
            <input
              className="hp-current"
              value={c.hitPointCurrent}
              onChange={(e) => set({ hitPointCurrent: e.target.value })}
              aria-label="Текущие хиты"
            />
            <div className="panel__caption">Текущие хиты</div>
          </section>

          <section className="panel hp-panel hp-panel--temp">
            <input
              className="hp-current"
              value={c.hitPointTemp}
              onChange={(e) => set({ hitPointTemp: e.target.value })}
              aria-label="Временные хиты"
            />
            <div className="panel__caption">Временные хиты</div>
          </section>

          <div className="hit-death-row">
            <section className="panel hit-dice">
              <label>
                Всего
                <input value={c.hitDiceTotal} onChange={(e) => set({ hitDiceTotal: e.target.value })} />
              </label>
              <input
                value={c.hitDiceCurrent}
                onChange={(e) => set({ hitDiceCurrent: e.target.value })}
                aria-label="Текущие кости хитов"
              />
              <div className="panel__caption">Кости хитов</div>
            </section>
            <section className="panel death-saves">
              <div className="death-line">
                <span>Успехи</span>
                {[0, 1, 2].map((i) => (
                  <button
                    key={`s${i}`}
                    type="button"
                    className="bubble-btn"
                    onClick={() =>
                      set({
                        deathSaveSuccesses: c.deathSaveSuccesses === i + 1 ? i : i + 1,
                      })
                    }
                  >
                    <Bubble filled={c.deathSaveSuccesses > i} />
                  </button>
                ))}
              </div>
              <div className="death-line">
                <span>Провалы</span>
                {[0, 1, 2].map((i) => (
                  <button
                    key={`f${i}`}
                    type="button"
                    className="bubble-btn"
                    onClick={() =>
                      set({
                        deathSaveFailures: c.deathSaveFailures === i + 1 ? i : i + 1,
                      })
                    }
                  >
                    <Bubble filled={c.deathSaveFailures > i} />
                  </button>
                ))}
              </div>
              <div className="panel__caption">Спасброски от смерти</div>
            </section>
          </div>

          <section className="panel attacks-panel">
            <div className="attacks-head">
              <span>Название</span>
              <span>Бонус атаки</span>
              <span>Урон / тип</span>
            </div>
            {c.attacks.map((row, idx) => (
              <div className="attacks-row" key={idx}>
                <input
                  value={row.name}
                  onChange={(e) => {
                    const attacks = c.attacks.map((a, i) =>
                      i === idx ? { ...a, name: e.target.value } : a,
                    );
                    set({ attacks });
                  }}
                />
                <input
                  value={row.attackBonus}
                  onChange={(e) => {
                    const attacks = c.attacks.map((a, i) =>
                      i === idx ? { ...a, attackBonus: e.target.value } : a,
                    );
                    set({ attacks });
                  }}
                />
                <input
                  value={row.damageType}
                  onChange={(e) => {
                    const attacks = c.attacks.map((a, i) =>
                      i === idx ? { ...a, damageType: e.target.value } : a,
                    );
                    set({ attacks });
                  }}
                />
              </div>
            ))}
            <ExpandingField
              value={c.attacksNotes}
              printMaxHeight="4.5rem"
              onChange={(attacksNotes) => set({ attacksNotes })}
              aria-label="Заметки к атакам"
            />
            <div className="panel__caption">Атаки и заклинания</div>
          </section>

          <section className="panel equipment-panel">
            <div className="coins">
              {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => (
                <label key={k}>
                  <span>{k.toUpperCase()}</span>
                  <input
                    value={c.coins[k]}
                    onChange={(e) => set({ coins: { ...c.coins, [k]: e.target.value } })}
                  />
                </label>
              ))}
            </div>
            <ExpandingField
              value={c.equipment}
              printMaxHeight="11rem"
              onChange={(equipment) => set({ equipment })}
              aria-label="Снаряжение"
            />
            <div className="panel__caption">Снаряжение</div>
          </section>
        </div>

        <div className="sheet-2014__col sheet-2014__col--right">
          <section className="panel personality-panel">
            <ExpandingField
              value={c.personalityTraits}
              printMaxHeight="3.2rem"
              onChange={(personalityTraits) => set({ personalityTraits })}
            />
            <div className="panel__caption">Черты характера</div>
          </section>
          <section className="panel personality-panel">
            <ExpandingField value={c.ideals} printMaxHeight="2.6rem" onChange={(ideals) => set({ ideals })} />
            <div className="panel__caption">Идеалы</div>
          </section>
          <section className="panel personality-panel">
            <ExpandingField value={c.bonds} printMaxHeight="2.6rem" onChange={(bonds) => set({ bonds })} />
            <div className="panel__caption">Привязанности</div>
          </section>
          <section className="panel personality-panel">
            <ExpandingField value={c.flaws} printMaxHeight="2.6rem" onChange={(flaws) => set({ flaws })} />
            <div className="panel__caption">Слабости</div>
          </section>
          <section className="panel features-panel">
            <ExpandingField
              value={c.featuresAndTraits}
              printMaxHeight="22rem"
              onChange={(featuresAndTraits) => set({ featuresAndTraits })}
              aria-label="Умения и особенности"
            />
            <div className="panel__caption">Умения и особенности</div>
          </section>
        </div>
      </div>
    </article>
  );
}
