/** Sorcerer 2024 «use» request payload (mirrors wizard). */

export type SorcererFeatureRequest = {
  featureId: string
  resourceId: string | null
  classSlug: string
  classEntryId: string
  name: string
}