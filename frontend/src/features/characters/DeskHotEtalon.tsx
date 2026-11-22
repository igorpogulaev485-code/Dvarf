type SceneId = 'combat' | 'explore' | 'social' | 'companions' | 'features'

type SkillChip = { name: string; mod: string; on?: boolean }

/** Live sheet-desktop.html lists after proficiency sync. Companions and features stay empty. */
const SCENE_SKILLS: Record<SceneId, SkillChip[]> = {
  combat: [
    { name: 'Атлетика', mod: '+4' },
    { name: 'Акробатика', mod: '+1' },
    { name: 'Скрытность', mod: '+1' },
    { name: 'Внимательность', mod: '+3' },
    { name: 'Анализ', mod: '0' },
    { name: 'Медицина', mod: '+6', on: true },
  ],
  explore: [
    { name: 'Внимательность', mod: '+3' },
    { name: 'Анализ', mod: '0' },
    { name: 'Скрытность', mod: '+1' },
    { name: 'Выживание', mod: '+3' },
    { name: 'Атлетика', mod: '+4' },
  ],
  social: [
    { name: 'Убеждение', mod: '+4', on: true },
    { name: 'Обман', mod: '+1' },
    { name: 'Проницательность', mod: '+6', on: true },
    { name: 'Запугивание', mod: '+1' },
    { name: 'Выступление', mod: '+1' },
  ],
  companions: [],
  features: [],
}

/** Desktop hot strip and scene skills from sheet-desktop.html. Phone keeps PlayDeskHotBar. */
export function DeskHotEtalon({ scene }: { scene: SceneId }) {
  const skills = SCENE_SKILLS[scene] ?? []
  return (
    <>
      <div className="desk-hot" data-panel="hotbar" aria-label="Горячая панель">
        <button type="button" className="hot-item" title="Божественный канал">
          <span className="hot-head">Божественный канал</span>
          <span className="hot-pips" aria-label="1 из 1"><i className="pip is-on" /></span>
        </button>
        <button type="button" className="hot-item" title="Пополнение жизней">
          <span className="hot-head">Пополнение жизней</span>
          <span className="hot-pips" aria-label="доступно"><i className="pip" /></span>
        </button>
        <button type="button" className="hot-item" title="Священный символ">
          <span className="hot-head">Священный символ</span>
        </button>
      </div>
      <div
        className={`desk-skills${skills.length === 0 ? ' is-empty' : ''}`}
        data-panel="scene-skills"
        aria-label="Навыки сцены"
      >
        {skills.map((skill) => (
          <button key={skill.name} type="button" className={`skill-chip${skill.on ? ' is-on' : ''}`}>
            <span>{skill.name}</span>
            <b className="num">{skill.mod}</b>
          </button>
        ))}
      </div>
    </>
  )
}
