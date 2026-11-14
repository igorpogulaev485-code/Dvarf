/**
 * /dev/ui-kit-etalon — витрина эталона шапки / ScrollRow (Игорь 14.11.2026).
 * Не для продакшен-навигации (маршрут только в import.meta.env.DEV).
 */
import { useState } from 'react'
import { IconCoin, IconRest, IconShield } from '../features/characters/deskIcons'
import {
  Chip,
  ChipStack,
  ClassChipRow,
  DetailsMenu,
  ResourcePips,
  ScrollRow,
  Text,
  VitalTile,
  VitalTileMenu,
  XpTrack,
} from '../ui'

const DEMO_CHIPS = [
  'Усиленная защита +1 КД',
  'Благословение',
  'Сопротивление огню',
  'Ускорение +2 КД',
  'Героизм +4 вр. хита/ход',
  'Щит веры +2 КД',
]

export function UiKitEtalonPreviewPage() {
  const [used, setUsed] = useState(1)
  const [tipOpen, setTipOpen] = useState(false)

  return (
    <main className="page page--app" style={{ maxWidth: 960, margin: '0 auto' }}>
      <Text as="h1">UI Kit etalon · 14.11.2026</Text>
      <Text tone="muted">
        /dev/ui-kit-etalon · эталон принят Игорем — вид шапки листа и ScrollRow
      </Text>

      <section
        className="play-desk play-desk--wide"
        style={{ marginTop: 24, display: 'grid', gap: 20 }}
      >
        <div>
          <Text as="h2">ScrollRow (переполнение + fade + ‹›)</Text>
          <div style={{ maxWidth: 420 }}>
            <ScrollRow
              ariaLabel="Демо скролл-ряда"
              className="play-desk__hot"
              shellClassName="play-desk__hot-wrap"
              itemSelector=":scope > .play-desk__hot-item"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="play-desk__hot-item play-desk__hot-item--btn">
                  Плитка {i + 1}
                </div>
              ))}
            </ScrollRow>
          </div>
        </div>

        <div>
          <Text as="h2">SCN-01 · SceneTurnControls</Text>
          <Text tone="muted">
            «Новый ход» + «кубики» рядом с норм/преим./помеха — без отдельной карточки
          </Text>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <div className="play-desk__roll-mode" role="group" aria-label="Преимущество">
              <button type="button" className="play-desk__roll-mode-btn is-on">
                норм
              </button>
              <button type="button" className="play-desk__roll-mode-btn">
                преим.
              </button>
              <button type="button" className="play-desk__roll-mode-btn">
                помеха
              </button>
              <button type="button" className="play-desk__roll-mode-btn">
                броски
              </button>
            </div>
            <div className="play-desk__mode-tools" role="group" aria-label="Броски и ход">
              <div
                className="scene-turn-controls scene-turn-controls--desk"
                role="group"
                aria-label="Ход и кубики"
                data-scn01-scene-turn="1"
              >
                <button type="button" className="play-desk__roll-mode-btn">
                  Новый ход
                </button>
                <label className="play-desk__roll-mode-btn scene-turn-controls__dice is-on">
                  <input type="checkbox" checked readOnly aria-label="Кубики на столе: включено" />
                  <span className="scene-turn-controls__dice-mark is-on" aria-hidden="true">
                    ✓
                  </span>
                  <span>кубики</span>
                </label>
              </div>
              <button type="button" className="play-desk__split-btn is-on">
                магия
              </button>
            </div>
          </div>
        </div>

        <div>
          <Text as="h2">Hot resource cards (HOT-01 / SCN-01)</Text>
          <Text tone="muted">
            Состояния — фикс. ширина/высота (пусто → «нет»); max ≤ 5 квадратики, max &gt; 5 —
            счётчик −/+
          </Text>
          <div
            className="play-desk__hot play-desk__hot-wrap"
            style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginTop: 8 }}
          >
            <button
              type="button"
              className="play-desk__hot-item play-desk__hot-item--btn play-desk__hot-item--states play-desk__hot-item--states-empty"
            >
              <span className="play-desk__hot-res-head">
                <span className="play-desk__hot-label">Состояния</span>
              </span>
              <span className="play-desk__hot-cond-empty">нет</span>
            </button>
            <button
              type="button"
              className="play-desk__hot-item play-desk__hot-item--btn play-desk__hot-item--states is-on"
            >
              <span className="play-desk__hot-res-head">
                <span className="play-desk__hot-label">Состояния</span>
              </span>
              <span className="play-desk__hot-cond-row">
                <span className="play-desk__hot-cond-chip">Оглохший</span>
              </span>
            </button>
            <div className="play-desk__hot-item play-desk__hot-item--res">
              <span className="play-desk__hot-res-head">
                <span className="play-desk__hot-res-name" title="Гнев бури">
                  Гнев бури
                </span>
              </span>
              <ResourcePips max={3} used={used} label="Гнев бури" onChange={setUsed} />
            </div>
            <div className="play-desk__hot-item play-desk__hot-item--res">
              <span className="play-desk__hot-res-head">
                <span
                  className="play-desk__hot-res-name"
                  title="Бардовское вдохновение"
                >
                  Бардовское вдохновение
                </span>
              </span>
              <ResourcePips
                max={3}
                used={1}
                label="Бардовское вдохновение"
                onChange={() => undefined}
              />
            </div>
            <div className="play-desk__hot-item play-desk__hot-item--res play-desk__hot-item--res-compact">
              <span className="play-desk__hot-res-head">
                <span className="play-desk__hot-res-name" title="Наложение рук">
                  Наложение рук
                </span>
              </span>
              <div
                className="play-desk__stepper"
                role="group"
                aria-label="Наложение рук: 18/25"
              >
                <button type="button" className="play-desk__step" aria-label="потратить">
                  −
                </button>
                <span className="play-desk__stepper-value">
                  18
                  <span className="play-desk__stepper-max">/25</span>
                </span>
                <button type="button" className="play-desk__step" aria-label="вернуть">
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Text as="h2">SCN-01 · навыки: владение vs компетентность</Text>
          <div
            className="play-desk__hot play-desk__hot--skills"
            style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', marginTop: 8 }}
          >
            <button type="button" className="play-desk__hot-item play-desk__hot-item--btn">
              <span>Атлетика</span>
              <b>+0</b>
            </button>
            <button
              type="button"
              className="play-desk__hot-item play-desk__hot-item--btn is-on"
              title="Акробатика: +5 · владение"
            >
              <span>Акробатика</span>
              <b>+5</b>
            </button>
            <button
              type="button"
              className="play-desk__hot-item play-desk__hot-item--btn is-on is-expert"
              title="Скрытность: +7 · компетентность"
            >
              <span>
                Скрытность
                <span className="play-desk__skill-expert-mark" aria-hidden="true">
                  ◆
                </span>
              </span>
              <b>+7</b>
            </button>
          </div>
        </div>

        <div>
          <Text as="h2">LP-01 · рельс характеристик: владение vs компетентность</Text>
          <Text tone="muted">
            владение = бледный фон + заполненный кружок · компетентность = сплошной --abil + белый
            текст + ◆ / двойной pip
          </Text>
          <article className="abil-block" data-abil="dex" style={{ marginTop: 8, maxWidth: 320 }}>
            <div className="abil-block__head">
              <span className="abil-block__drag">⋮⋮</span>
              <div className="abil-block__label">
                <button type="button" className="abil-block__label-open">
                  <span className="abil-block__label-text">Ловкость</span>
                </button>
              </div>
              <div className="abil-block__meta">
                <div className="abil-block__score-wrap">
                  <span
                    className="abil-block__score ui-input"
                    style={{
                      display: 'inline-grid',
                      placeItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    16
                  </span>
                </div>
                <div className="abil-block__mods">
                  <button type="button" className="abil-mod abil-mod--btn abil-mod--roll">
                    <span className="abil-mod__tag">Пр</span>
                    <span className="abil-mod__num">+3</span>
                  </button>
                  <div className="abil-mod-pair">
                    <button
                      type="button"
                      className="abil-prof-pip is-on"
                      title="владение"
                      aria-label="владение спасброском"
                    />
                    <button
                      type="button"
                      className="abil-mod abil-mod--btn abil-mod--roll is-proficient"
                      title="Спасбросок · владение"
                    >
                      <span className="abil-mod__tag">Сп</span>
                      <span className="abil-mod__num">+5</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="abil-block__skills">
              <div className="abil-skill is-on">
                <button
                  type="button"
                  className="abil-prof-pip is-on"
                  title="владение"
                  aria-label="Акробатика: владение"
                />
                <span className="abil-skill__name" title="Акробатика · владение">
                  Акробатика
                </span>
                <button type="button" className="abil-skill__roll" title="Акробатика · владение">
                  +5
                </button>
              </div>
              <div className="abil-skill is-on">
                <button
                  type="button"
                  className="abil-prof-pip is-on"
                  title="владение"
                  aria-label="Ловкость рук: владение"
                />
                <span className="abil-skill__name" title="Ловкость рук · владение">
                  Ловкость рук
                </span>
                <button type="button" className="abil-skill__roll" title="Ловкость рук · владение">
                  +5
                </button>
              </div>
              <div className="abil-skill is-on is-expert">
                <button
                  type="button"
                  className="abil-prof-pip is-on is-expert"
                  title="компетентность"
                  aria-label="Скрытность: компетентность"
                />
                <span className="abil-skill__name" title="Скрытность · компетентность">
                  Скрытность
                  <span className="abil-skill__expert-mark" aria-hidden="true">
                    ◆
                  </span>
                </span>
                <button
                  type="button"
                  className="abil-skill__roll"
                  title="Скрытность · компетентность"
                >
                  +7
                </button>
              </div>
            </div>
          </article>
          <div className="play-desk__rail-foot" style={{ marginTop: 10, maxWidth: 320 }}>
            <div className="play-desk__passives play-desk__passives--compact">
              <div className="play-desk__passives-label">Пассивы</div>
              <div className="passive-grid passive-grid--desk">
                <div className="passive-card">
                  <span className="passive-card__label">Внимат.</span>
                  <strong>17</strong>
                </div>
                <div className="passive-card">
                  <span className="passive-card__label">Анализ</span>
                  <strong>11</strong>
                </div>
                <div className="passive-card">
                  <span className="passive-card__label">Прониц.</span>
                  <strong>11</strong>
                </div>
              </div>
              <div className="darkvision-sense">
                <button type="button" className="darkvision-sense__summary" title="Тёмное зрение 60 фт">
                  <span className="darkvision-sense__label">Тёмное зрение</span>
                  <strong className="darkvision-sense__value">60 фт</strong>
                </button>
              </div>
            </div>
            <section className="ownership-summary" aria-label="Владения">
              <div className="ownership-summary__head">
                <button type="button" className="ownership-summary__open" title="Владения">
                  <span className="ownership-summary__title">Владения</span>
                  <span className="ownership-summary__cta" aria-hidden="true">
                    ▸
                  </span>
                </button>
              </div>
              <div className="ownership-summary__body">
                <div className="ownership-summary__row">
                  <span className="ownership-summary__label">Доспехи</span>
                  <div className="ownership-summary__chips">
                    <span className="ownership-summary__chip">Лёгкие</span>
                  </div>
                </div>
                <div className="ownership-summary__row">
                  <span className="ownership-summary__label">Оружие</span>
                  <div className="ownership-summary__chips">
                    <span className="ownership-summary__chip">Простое</span>
                    <span className="ownership-summary__chip">Рапира</span>
                    <span className="ownership-summary__chip">Короткий меч</span>
                    <span className="ownership-summary__chip">+1</span>
                  </div>
                </div>
                <div className="ownership-summary__row">
                  <span className="ownership-summary__label">Инструменты</span>
                  <div className="ownership-summary__chips">
                    <span className="ownership-summary__chip">Воровские инструменты</span>
                  </div>
                </div>
                <div className="ownership-summary__row">
                  <span className="ownership-summary__label">Языки</span>
                  <div className="ownership-summary__chips">
                    <span className="ownership-summary__chip">Общий</span>
                    <span className="ownership-summary__chip">Воровской жаргон</span>
                  </div>
                </div>
              </div>
            </section>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <button type="button" className="sheet-chip">
                Средние
              </button>
              <button type="button" className="sheet-chip is-on">
                <span className="sheet-chip__check" aria-hidden="true">
                  ✓
                </span>
                Лёгкие
              </button>
              <button type="button" className="sheet-chip is-on">
                <span className="sheet-chip__check" aria-hidden="true">
                  ✓
                </span>
                Простое
              </button>
            </div>
            <section className="onboarding-checklist onboarding-checklist--compact is-collapsed">
              <button type="button" className="onboarding-checklist__summary" aria-expanded={false}>
                <span className="onboarding-checklist__summary-label">Можно позже · 7</span>
                <span className="onboarding-checklist__summary-chevron" aria-hidden="true">
                  ▸
                </span>
              </button>
            </section>
          </div>
        </div>

        <div>
          <Text as="h2">ClassChipRow (+N overflow)</Text>
          <div style={{ maxWidth: 280 }}>
            <ClassChipRow
              many
              aria-label="Классы"
              items={[
                {
                  id: 'f',
                  label: 'Воин 3',
                  archetype: 'Мастер боевых искусств',
                  className: 'Воин',
                  level: 3,
                },
                {
                  id: 'r',
                  label: 'Плут 2',
                  archetype: 'Вор',
                  className: 'Плут',
                  level: 2,
                },
                {
                  id: 'w',
                  label: 'Волшебник 2',
                  archetype: 'Школа воплощения',
                  className: 'Волшебник',
                  level: 2,
                },
                {
                  id: 'b',
                  label: 'Бард 1',
                  archetype: 'Коллегия доблести',
                  className: 'Бард',
                  level: 1,
                },
              ]}
            />
          </div>
        </div>

        <div>
          <Text as="h2">XpTrack</Text>
          <XpTrack
            level={3}
            ratio={900 / 2700}
            remainLabel="900 / 2 700 XP · до ур. 4 — 1 800"
            onClick={() => undefined}
          />
        </div>

        <div>
          <Text as="h2">ChipStack</Text>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ChipStack>
              <button type="button" className="play-desk-header__chip is-on">
                <span className="play-desk-vital__label-row">Вдохн.</span>
                <b>да</b>
              </button>
              <button type="button" className="play-desk-header__chip is-warn">
                <span className="play-desk-vital__label-row">Истощ.</span>
                <b>2</b>
              </button>
            </ChipStack>
            <ChipStack variant="tools">
              <button type="button" className="play-desk-header__coin">
                <IconCoin className="play-desk-header__btn-icon" />
                <span>1,23 млн зм</span>
              </button>
              <button type="button" className="play-desk-header__rest">
                <IconRest className="play-desk-header__btn-icon" />
                <span className="play-desk-vital__label-row">Отдых</span>
              </button>
            </ChipStack>
          </div>
        </div>

        <div>
          <Text as="h2">VitalTile</Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <VitalTile
              as="div"
              icon={<IconShield className="play-desk-vital__icon" />}
              value={21}
              label={
                <span className="ui-vital__shield-tog play-desk-vital__shield-tog is-on">
                  Щит
                </span>
              }
              className="play-desk-vital--shield is-shield-on"
              title="Класс доспеха 21"
            />
            <VitalTile
              as="div"
              value={17}
              label="Скор."
              className="play-desk-vital play-desk-vital--speed"
            />
            <VitalTile as="div" value="+4" label="Иниц." className="play-desk-vital" />
            <VitalTile as="div" value="+3" label="БМ" className="play-desk-vital" />
          </div>
          <Text as="h2">VitalTileMenu (phone speed +N)</Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 120 }}>
            <VitalTileMenu
              value={25}
              label="Скор."
              badge="+3"
              menu={
                <ul className="ui-vital-menu__list">
                  <li className="ui-vital-menu__row">
                    <span className="ui-vital-menu__row-label">ходьба</span>
                    <span className="ui-vital-menu__row-value">25 фт</span>
                  </li>
                  <li className="ui-vital-menu__row">
                    <span className="ui-vital-menu__row-label">лазание</span>
                    <span className="ui-vital-menu__row-value">10 фт</span>
                  </li>
                  <li className="ui-vital-menu__row">
                    <span className="ui-vital-menu__row-label">плавание</span>
                    <span className="ui-vital-menu__row-value">10 фт</span>
                  </li>
                  <li className="ui-vital-menu__row">
                    <span className="ui-vital-menu__row-label">полёт</span>
                    <span className="ui-vital-menu__row-value">15 фт</span>
                  </li>
                </ul>
              }
            />
          </div>
        </div>

        <div>
          <Text as="h2">Chip + +N (DetailsMenu)</Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {DEMO_CHIPS.slice(0, 3).map((face) => (
              <Chip
                key={face}
                tipOpen={tipOpen && face === DEMO_CHIPS[0]}
                labelProps={{
                  onClick: () => setTipOpen((v) => (face === DEMO_CHIPS[0] ? !v : v)),
                }}
                tip={
                  face === DEMO_CHIPS[0] ? (
                    <>
                      <span>от союзника</span>
                      <span>концентрация</span>
                      <span>осталось 9 раундов</span>
                    </>
                  ) : null
                }
                onDismiss={() => undefined}
                dismissLabel={`Снять «${face}»`}
              >
                <strong>{face}</strong>
              </Chip>
            ))}
            <DetailsMenu
              className="active-effects__more"
              summary="+3"
              summaryClassName="active-effects__more-summary"
              panelClassName="active-effects__more-panel"
            >
              <div className="active-effects__more-list" role="list">
                {DEMO_CHIPS.slice(3).map((face) => (
                  <Chip key={face} onDismiss={() => undefined} dismissLabel={`Снять «${face}»`}>
                    <strong>{face}</strong>
                  </Chip>
                ))}
              </div>
            </DetailsMenu>
          </div>
        </div>
      </section>
    </main>
  )
}
