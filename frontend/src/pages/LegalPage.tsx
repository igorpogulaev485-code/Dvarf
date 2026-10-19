import { Link } from 'react-router-dom'
import {
  AppLegalFooter,
  Creed20Wordmark,
  LEGAL_CONTACT_EMAIL,
  PRODUCT_SITE_URL,
} from '../shared/brand/creed20'
import { Panel, Stack, Text } from '../ui'

export function LegalPage() {
  return (
    <main className="page page--app page--legal">
      <Stack gap={20}>
        <header className="legal-page__header">
          <Link className="back-link" to="/login">
            ← На вход
          </Link>
          <Stack gap={8}>
            <Text as="h1">
              <Creed20Wordmark />
            </Text>
            <Text tone="muted">
              Из слова «Крит»: буква Т зачёркнута и заменена на D → КриD20. Каждый бросок
              двадцатки создаёт историю.
            </Text>
          </Stack>
        </header>

        <Panel title="Кто мы">
          <Stack gap={10}>
            <Text>
              <Creed20Wordmark /> — неофициальный инструмент для настольной игры Dungeons &amp;
              Dragons (лист персонажа, стол, справочники для удобной игры). Это фан-проект: мы не
              связаны с Wizards of the Coast и не являемся официальным продуктом D&amp;D.
            </Text>
            <Text tone="muted">
              Сайт продукта: {PRODUCT_SITE_URL} (после настройки DNS/HTTPS). Сейчас вы на рабочей
              версии сервиса.
            </Text>
          </Stack>
        </Panel>

        <Panel title="Справочники и правила">
          <Stack gap={10}>
            <Text>
              Часть материалов совпадает с System Reference Document (SRD) и используется на
              условиях Creative Commons Attribution 4.0 International (CC BY 4.0) с обязательной
              атрибуцией ниже.
            </Text>
            <Text>
              Остальные справочные данные (официальные книги вне SRD) размещены как бесплатный
              community reference для игры за столом: доступ к ним не продаётся. Когда появятся
              платные опции, это будет удобство сервиса (облако, стол, лимиты), а не «доступ к
              книгам».
            </Text>
          </Stack>
        </Panel>

        <Panel title="Атрибуция SRD">
          <Stack gap={10}>
            <Text>
              This work includes material from the System Reference Document 5.1 and/or 5.2.1
              (“SRD”) by Wizards of the Coast LLC, available at{' '}
              <a
                href="https://www.dndbeyond.com/srd"
                target="_blank"
                rel="noreferrer noopener"
              >
                dndbeyond.com/srd
              </a>
              . The SRD is licensed under the Creative Commons Attribution 4.0 International
              License (
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer noopener"
              >
                CC BY 4.0
              </a>
              ).
            </Text>
          </Stack>
        </Panel>

        <Panel title="Жалобы и связь">
          <Stack gap={10}>
            <Text>
              Если вы правообладатель и считаете, что материал размещён с нарушением прав,
              напишите на{' '}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> — разберём и при
              необходимости снимем карточку.
            </Text>
            <Text tone="muted">По общим вопросам сервиса — тот же адрес.</Text>
          </Stack>
        </Panel>

        <AppLegalFooter />
      </Stack>
    </main>
  )
}
