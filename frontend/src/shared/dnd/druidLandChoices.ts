/** Circle of the Land terrain picks (PHB 2014). */

export type DruidLandTypeDef = {
  id: string
  nameRu: string
  nameEn: string
}

export const DRUID_LAND_TYPES: DruidLandTypeDef[] = [
  { id: 'arctic', nameRu: 'Арктика', nameEn: 'Arctic' },
  { id: 'coast', nameRu: 'Побережье', nameEn: 'Coast' },
  { id: 'desert', nameRu: 'Пустыня', nameEn: 'Desert' },
  { id: 'forest', nameRu: 'Лес', nameEn: 'Forest' },
  { id: 'grassland', nameRu: 'Луга', nameEn: 'Grassland' },
  { id: 'mountain', nameRu: 'Горы', nameEn: 'Mountain' },
  { id: 'swamp', nameRu: 'Болото', nameEn: 'Swamp' },
  { id: 'underdark', nameRu: 'Подземье', nameEn: 'Underdark' },
]

export function druidLandById(id: string | null | undefined): DruidLandTypeDef | null {
  if (!id) return null
  return DRUID_LAND_TYPES.find((row) => row.id === id) ?? null
}

export function druidLandLabel(id: string): string {
  return druidLandById(id)?.nameRu || id
}
