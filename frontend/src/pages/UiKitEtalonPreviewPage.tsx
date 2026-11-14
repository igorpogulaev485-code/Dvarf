/**
 * /dev/ui-kit-etalon — витрина эталона шапки / ScrollRow (Игорь 14.11.2026).
 * Не для продакшен-навигации.
 */
import { useState } from 'react'
import {
  Chip,
  ChipStack,
  ClassChipRow,
  DetailsMenu,
  ResourcePips,
  ScrollRow,
  Text,
  VitalTile,
  XpTrack,
} from '../ui'

const DEMO_CHIPS = [
  'Усиленная защита +1 КД',
  'Благословение',
  'Сопротивление огню',
  'Ускорение +2 КД',
  'Героизм',
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

      <section style={{ marginTop: 24, display: 'grid', gap: 16 }}>
        <Text as="h2">ScrollRow</Text>
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

        <Text as="h2">ResourcePips</Text>
        <ResourcePips max={3} used={used} label="Демо" onChange={setUsed} />

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

        <Text as="h2">XpTrack</Text>
        <XpTrack
          level={3}
          ratio={900 / 2700}
          remainLabel="900 / 2 700 XP · до ур. 4 — 1 800"
          onClick={() => undefined}
        />

        <Text as="h2">ChipStack</Text>
        <div style={{ display: 'flex', gap: 12 }}>
          <ChipStack>
            <button type="button" className="play-desk-header__chip is-on">
              <span className="play-desk-vital__label-row">Вдохн.</span>
              <b>да</b>
            </button>
            <button type="button" className="play-desk-header__chip">
              <span className="play-desk-vital__label-row">Истощ.</span>
              <b>0</b>
            </button>
          </ChipStack>
          <ChipStack variant="tools">
            <button type="button" className="play-desk-header__coin">
              0 зм
            </button>
            <button type="button" className="play-desk-header__rest">
              Отдых
            </button>
          </ChipStack>
        </div>

        <Text as="h2">VitalTile</Text>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <VitalTile as="div" value={23} label="КД" className="play-desk-vital--shield">
            <span className="play-desk-vital__shield-tog is-on">Щит</span>
          </VitalTile>
          <VitalTile value={25} label="Скор." className="play-desk-vital--speed" />
          <VitalTile value="+0" label="Иниц." />
          <VitalTile value="+2" label="БМ" />
        </div>

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
          <DetailsMenu summary="+3" summaryClassName="active-effects__more-summary">
            <div style={{ display: 'grid', gap: 6 }}>
              {DEMO_CHIPS.slice(3).map((face) => (
                <Chip key={face} onDismiss={() => undefined} dismissLabel={`Снять «${face}»`}>
                  <strong>{face}</strong>
                </Chip>
              ))}
            </div>
          </DetailsMenu>
        </div>
      </section>
    </main>
  )
}
