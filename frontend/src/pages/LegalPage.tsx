import { Link } from 'react-router-dom'
import {
  AppLegalFooter,
  Creed20Wordmark,
  LEGAL_CONTACT_EMAIL,
  PRODUCT_SITE_URL,
} from '../shared/brand/creed20'
import { Stack, Text } from '../ui'

export function LegalPage() {
  return (
    <main className="page page--app page--legal">
      <Stack gap={20}>
        <header className="legal-page__header">
          <Link className="back-link" to="/login">
            ← На вход
          </Link>
          <Stack gap={10}>
            <Text as="h1">
              <Creed20Wordmark />
            </Text>
            <Text>Инструмент для настольной игры: лист персонажа и стол.</Text>
          </Stack>
        </header>

        <Stack gap={8}>
          <Text>
            Вопросы и замечания по сервису или материалам:{' '}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
          </Text>
          <Text tone="muted">Сайт: {PRODUCT_SITE_URL.replace(/^https?:\/\//, '')}</Text>
        </Stack>

        <Text tone="muted" className="legal-page__srd">
          Материалы SRD используются на условиях{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer noopener"
          >
            CC BY 4.0
          </a>{' '}
          (
          <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noreferrer noopener">
            dndbeyond.com/srd
          </a>
          ).
        </Text>

        <AppLegalFooter />
      </Stack>
    </main>
  )
}
