import type { Character } from '../../types/character';
import { ExpandingField } from '../../components/ExpandingField';

type Props = {
  character: Character;
  onChange: (next: Character) => void;
};

export function Sheet2014Page2({ character: c, onChange }: Props) {
  const set = (patch: Partial<Character>) => onChange({ ...c, ...patch });

  return (
    <article className="sheet sheet-2014 sheet-2014--page2" aria-label="Лист персонажа 2014, страница 2">
      <header className="sheet-2014__header sheet-2014__header--simple">
        <div className="sheet-2014__brand">
          <div className="sheet-2014__brand-mark">D&amp;D</div>
        </div>
        <label className="sheet-2014__name-banner">
          <span>Имя персонажа</span>
          <input value={c.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="sheet-2014__physique">
          <label>
            <span>Возраст</span>
            <input value={c.age} onChange={(e) => set({ age: e.target.value })} />
          </label>
          <label>
            <span>Рост</span>
            <input value={c.height} onChange={(e) => set({ height: e.target.value })} />
          </label>
          <label>
            <span>Вес</span>
            <input value={c.weight} onChange={(e) => set({ weight: e.target.value })} />
          </label>
          <label>
            <span>Глаза</span>
            <input value={c.eyes} onChange={(e) => set({ eyes: e.target.value })} />
          </label>
          <label>
            <span>Кожа</span>
            <input value={c.skin} onChange={(e) => set({ skin: e.target.value })} />
          </label>
          <label>
            <span>Волосы</span>
            <input value={c.hair} onChange={(e) => set({ hair: e.target.value })} />
          </label>
        </div>
      </header>

      <div className="sheet-2014-page2__grid">
        <section className="panel appearance-panel">
          <ExpandingField
            value={c.appearance}
            printMaxHeight="16rem"
            onChange={(appearance) => set({ appearance })}
            placeholder="Описание или место для портрета"
          />
          <div className="panel__caption">Внешность персонажа</div>
        </section>

        <section className="panel allies-panel">
          <ExpandingField
            value={c.alliesAndOrganizations}
            printMaxHeight="10rem"
            onChange={(alliesAndOrganizations) => set({ alliesAndOrganizations })}
          />
          <div className="panel__caption">Союзники и организации</div>
        </section>

        <section className="panel backstory-panel">
          <ExpandingField
            value={c.backstory}
            printMaxHeight="22rem"
            onChange={(backstory) => set({ backstory })}
          />
          <div className="panel__caption">Предыстория персонажа</div>
        </section>

        <div className="sheet-2014-page2__right-stack">
          <section className="panel">
            <ExpandingField
              value={c.additionalFeaturesAndTraits}
              printMaxHeight="10rem"
              onChange={(additionalFeaturesAndTraits) => set({ additionalFeaturesAndTraits })}
            />
            <div className="panel__caption">Дополнительные умения и особенности</div>
          </section>
          <section className="panel">
            <ExpandingField
              value={c.treasure}
              printMaxHeight="10rem"
              onChange={(treasure) => set({ treasure })}
            />
            <div className="panel__caption">Сокровища</div>
          </section>
        </div>
      </div>
    </article>
  );
}
