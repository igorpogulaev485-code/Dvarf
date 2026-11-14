/**
 * /dev/ui-kit-etalon — витрина эталона шапки / ScrollRow (Игорь 14.11.2026).
 * Не для продакшен-навигации (маршрут только в import.meta.env.DEV).
 */
import { useState } from 'react'
import { IconCoin, IconRest } from '../features/characters/deskIcons'
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
          <Text as="h2">ResourcePips</Text>
          <div className="play-desk__hot-item play-desk__hot-item--res">
            <span className="play-desk__hot-res-head">
              <span className="play-desk__hot-res-name">Гнев бури</span>
            </span>
            <ResourcePips max={3} used={used} label="Гнев бури" onChange={setUsed} />
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
              value={21}
              label="КД"
              className="play-desk-vital play-desk-vital--shield is-shield-on"
            >
              <span className="play-desk-vital__shield-tog is-on">Щит</span>
            </VitalTile>
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
