/** Summary step: what the level-1 sheet will look like after «Готово». */

import type { ReactNode } from 'react'
import { Stack, Text } from '../../ui'
import { formatModifier } from '../characters/sheetTypes'
import type { SheetPreviewModel } from './create2024SheetPreview'

type Create2024SheetPreviewProps = {
  model: SheetPreviewModel
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="create-2024__sheet-section">
      <Text as="h3" className="create-pipeline__section-title">
        {title}
      </Text>
      {children}
    </section>
  )
}

function Vital({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="create-2024__vital" data-testid={testId}>
      <span className="create-2024__vital-value">{value}</span>
      <span className="create-2024__vital-label">{label}</span>
    </div>
  )
}

export function Create2024SheetPreview({ model }: Create2024SheetPreviewProps) {
  const trained = model.skills.filter((skill) => skill.proficient)
  return (
    <div className="create-2024__sheet" data-testid="p24-m03-sheet-preview">
      <Stack gap={14}>
        <header className="create-2024__sheet-head">
          <Text as="h2">{model.name}</Text>
          <Text tone="muted">
            {model.speciesName} · {model.className} {model.level} · {model.backgroundName}
          </Text>
        </header>

        <div className="create-2024__vitals">
          <Vital label="Хиты" value={String(model.hpMax)} testId="p24-m03-sheet-hp" />
          <Vital label="Класс доспеха" value={String(model.ac)} testId="p24-m03-sheet-ac" />
          <Vital
            label="Инициатива"
            value={formatModifier(model.initiative)}
            testId="p24-m03-sheet-initiative"
          />
          <Vital label="Скорость" value={`${model.speed} фт.`} testId="p24-m03-sheet-speed" />
          <Vital
            label="Бонус мастерства"
            value={formatModifier(model.proficiencyBonus)}
            testId="p24-m03-sheet-prof"
          />
        </div>
        <Text tone="muted">
          Кость хитов {model.hitDie} · размер: {model.size}
          {model.darkvision ? ` · тёмное зрение ${model.darkvision} фт.` : ''}
        </Text>

        <Section title="Характеристики">
          <div className="create-2024__abilities">
            {model.abilities.map((ability) => (
              <div
                key={ability.key}
                className="create-2024__ability"
                data-testid={`p24-m03-sheet-ability-${ability.key}`}
              >
                <span className="create-2024__ability-name">{ability.label}</span>
                <span className="create-2024__ability-score">{ability.score}</span>
                <span className="create-2024__ability-mod">{formatModifier(ability.mod)}</span>
                <span className="create-2024__ability-save">
                  Спасбросок {formatModifier(ability.saveMod)}
                  {ability.saveProficient ? ' ●' : ''}
                </span>
                {ability.bonus ? (
                  <span className="create-2024__ability-bonus">
                    {ability.base} + {ability.bonus} предыстория
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Навыки">
          {trained.length ? (
            <ul className="create-2024__list create-2024__list--cols">
              {trained.map((skill) => (
                <li key={skill.key}>
                  {formatModifier(skill.mod)} {skill.label}
                  {skill.expertise ? ' (компетентность)' : ''}
                </li>
              ))}
            </ul>
          ) : (
            <Text tone="muted">Нет владений навыками.</Text>
          )}
        </Section>

        {model.feats.length ? (
          <Section title="Черты">
            <ul className="create-2024__list">
              {model.feats.map((feat) => (
                <li key={`${feat.source}-${feat.name}`}>
                  <strong>{feat.name}</strong> · {feat.source}
                  {feat.details.length ? (
                    <ul className="create-2024__list create-2024__list--nested">
                      {feat.details.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {model.weaponMastery.length ? (
          <Section title="Мастерство оружия">
            <ul className="create-2024__list">
              {model.weaponMastery.map((row) => (
                <li key={row.name}>
                  {row.name} — {row.property}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Снаряжение">
          <ul className="create-2024__list create-2024__list--cols" data-testid="p24-m03-sheet-items">
            {model.inventory.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.name}
                {item.qty > 1 ? ` ×${item.qty}` : ''}
                {item.equipped ? ' (надето)' : ''}
                {item.note ? <span className="create-2024__note"> — {item.note}</span> : null}
              </li>
            ))}
          </ul>
          <Text tone="muted">Монеты: {model.coinsGp} зм</Text>
        </Section>

        {model.cantrips.length ||
        model.spellbook.length ||
        model.preparedSpells.length ||
        model.featSpells.length ? (
          <Section title="Заклинания">
            <ul className="create-2024__list">
              {model.castingAbility ? (
                <li>Заклинательная характеристика: {model.castingAbility}</li>
              ) : null}
              {model.cantrips.length ? <li>Заговоры: {model.cantrips.join(', ')}</li> : null}
              {model.spellbook.length ? (
                <li data-testid="p24-m03-sheet-spellbook">В книге: {model.spellbook.join(', ')}</li>
              ) : null}
              {model.preparedSpells.length ? (
                <li>Подготовлено: {model.preparedSpells.join(', ')}</li>
              ) : null}
              {model.featSpells.length ? <li>От черт: {model.featSpells.join(', ')}</li> : null}
            </ul>
          </Section>
        ) : null}

        <Section title="Языки и инструменты">
          <ul className="create-2024__list">
            <li>Языки: {model.languages.join(', ')}</li>
            <li>Инструменты: {model.tools.length ? model.tools.join(', ') : 'нет'}</li>
          </ul>
        </Section>

        {model.classFeatures.length || model.traits.length ? (
          <Section title="Умения">
            <ul className="create-2024__list">
              {model.classFeatures.map((name) => (
                <li key={name}>{name}</li>
              ))}
              {model.traits.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Section>
        ) : null}
      </Stack>
    </div>
  )
}
