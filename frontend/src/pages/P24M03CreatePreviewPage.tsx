/**
 * DEV preview for P24-M03 Playwright: 2024 create wizard on the full catalog from the
 * shipped seed JSON (all classes, backgrounds, species). The real wizard never uses it.
 * Does not open RULES_EDITION_2024_OPEN.
 */
import { useEffect, useState } from 'react'
import { Text } from '../ui'
import { CreateCharacter2024Page, type Create2024Harness } from './CreateCharacter2024Page'

export function P24M03CreatePreviewPage() {
  const [harness, setHarness] = useState<Create2024Harness | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let cancelled = false
    void import('../features/createPipeline2024/createPipeline2024Fixtures').then((mod) => {
      if (cancelled) return
      setHarness({ catalog: mod.buildCreate2024Fixtures(), languages: mod.FIXTURE_LANGUAGES })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!harness) {
    return (
      <main className="page page--app page--create-pipeline" data-testid="p24-m03-preview">
        <Text tone="muted">Загрузка каталога…</Text>
      </main>
    )
  }
  return <CreateCharacter2024Page harness={harness} rootTestId="p24-m03-preview" />
}
