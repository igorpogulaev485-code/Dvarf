/** P24-01: lineage label — «раса» (2014) / «вид» (2024). Catalog kind stays `race`. */

export type RulesEditionLabel = '2014' | '2024' | string

export function raceSpeciesLabel(rulesEdition: RulesEditionLabel | null | undefined): string {
  const value = String(rulesEdition ?? '2014').trim()
  return value === '2024' ? 'вид' : 'раса'
}

export function raceSpeciesLabelTitle(
  rulesEdition: RulesEditionLabel | null | undefined,
): string {
  const word = raceSpeciesLabel(rulesEdition)
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export function raceSpeciesSectionTitle(
  rulesEdition: RulesEditionLabel | null | undefined,
): string {
  return `${raceSpeciesLabelTitle(rulesEdition)} и прошлое`
}
