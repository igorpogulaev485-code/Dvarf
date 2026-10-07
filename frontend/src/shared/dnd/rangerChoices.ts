/** PHB 2014 Ranger favored enemy / terrain picks. */

export const RANGER_FAVORED_ENEMIES: Array<{ id: string; nameRu: string }> = [
  { id: 'aberrations', nameRu: 'Аберрации' },
  { id: 'beasts', nameRu: 'Звери' },
  { id: 'celestials', nameRu: 'Небожители' },
  { id: 'constructs', nameRu: 'Конструкты' },
  { id: 'dragons', nameRu: 'Драконы' },
  { id: 'elementals', nameRu: 'Элементали' },
  { id: 'fey', nameRu: 'Феи' },
  { id: 'fiends', nameRu: 'Фиенды' },
  { id: 'giants', nameRu: 'Великаны' },
  { id: 'monstrosities', nameRu: 'Монстры' },
  { id: 'oozes', nameRu: 'Желе' },
  { id: 'plants', nameRu: 'Растения' },
  { id: 'undead', nameRu: 'Нежить' },
  { id: 'humanoids', nameRu: 'Гуманоиды (две расы)' },
]

export const RANGER_FAVORED_TERRAINS: Array<{ id: string; nameRu: string }> = [
  { id: 'arctic', nameRu: 'Арктика' },
  { id: 'coast', nameRu: 'Побережье' },
  { id: 'desert', nameRu: 'Пустыня' },
  { id: 'forest', nameRu: 'Лес' },
  { id: 'grassland', nameRu: 'Луга' },
  { id: 'mountain', nameRu: 'Горы' },
  { id: 'swamp', nameRu: 'Болото' },
  { id: 'underdark', nameRu: 'Подземье' },
]

export function rangerChoiceLabel(optionId: string): string | null {
  const enemy = RANGER_FAVORED_ENEMIES.find((row) => row.id === optionId)
  if (enemy) return enemy.nameRu
  const terrain = RANGER_FAVORED_TERRAINS.find((row) => row.id === optionId)
  if (terrain) return terrain.nameRu
  return null
}
