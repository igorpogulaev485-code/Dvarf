/** Pending / unlocked racial conditional effects for the leveling step. */

import { useMemo } from 'react'
import { Stack, Text } from '../../ui'
import {
  racialSpellUnlocked,
  type RaceRacialSpell,
} from '../../shared/dnd/raceGrants'

export type RacialEffectsPanelProps = {
  racialSpells: RaceRacialSpell[]
  characterLevel: number
  hasCasterClass: boolean
  featNoteRu?: string | null
}

export function RacialEffectsPanel({
  racialSpells,
  characterLevel,
  hasCasterClass,
  featNoteRu,
}: RacialEffectsPanelProps) {
  const rows = useMemo(() => {
    return racialSpells.map((spell) => {
      const levelOk = racialSpellUnlocked(spell, characterLevel)
      const casterOk = spell.grant !== 'spell_list' || hasCasterClass
      const unlocked = levelOk && casterOk
      let pendingReason: string | null = null
      if (!levelOk) pendingReason = `нужен ${spell.unlockLevel}+ ур. персонажа`
      else if (!casterOk) pendingReason = 'нужен класс с заклинаниями'
      return { spell, unlocked, pendingReason }
    })
  }, [characterLevel, hasCasterClass, racialSpells])

  if (!rows.length && !featNoteRu) return null

  return (
    <div className="create-pipeline__racial-effects">
      <Stack gap={8}>
        <Text as="h3">Расовые эффекты</Text>
        <Text tone="muted">
          Условные расовые заклинания и врата — открываются при уровне / классе-кастере /
          архетипе.
        </Text>
        {featNoteRu ? (
          <Text>
            Черта с расы: {featNoteRu}
          </Text>
        ) : null}
        {rows.length ? (
          <ul className="create-pipeline__detail-list">
            {rows.map(({ spell, unlocked, pendingReason }) => (
              <li key={spell.id}>
                <span
                  className={
                    unlocked
                      ? 'create-pipeline__effect create-pipeline__effect--on'
                      : 'create-pipeline__effect create-pipeline__effect--off'
                  }
                >
                  {unlocked ? 'открыто' : 'ожидает'}
                </span>{' '}
                {spell.nameRu}
                {spell.grant === 'spell_list' ? ' · список кастера' : ' · врождённое'}
                {pendingReason ? (
                  <Text as="span" tone="muted">
                    {' '}
                    — {pendingReason}
                  </Text>
                ) : null}
                {spell.notesRu ? (
                  <Text as="span" tone="muted">
                    {' '}
                    ({spell.notesRu})
                  </Text>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Text tone="muted">У выбранной расы нет условных расовых заклинаний в данных.</Text>
        )}
      </Stack>
    </div>
  )
}
