import type { SheetResource } from '../../shared/dnd/rest'
import type { UnlockedFeature } from '../../shared/dnd/classFeatures'
import type { AppliedFeatGrant } from '../../shared/dnd/featGrants'

type PlayDeskFeaturesCompactProps = {
  features: UnlockedFeature[]
  featGrants: AppliedFeatGrant[]
  resources: SheetResource[]
  darkvision: number
  raceName: string
  onSpendResource?: (id: string) => void
  onOpenFull: () => void
  onToast?: (message: string) => void
}

export function PlayDeskFeaturesCompact({
  features,
  featGrants,
  resources,
  darkvision,
  raceName,
  onSpendResource,
  onOpenFull,
  onToast,
}: PlayDeskFeaturesCompactProps) {
  const namedResources = resources.filter((row) => row.max > 0 && row.name.trim())
  const topFeatures = features.slice(0, 10)
  const feats = featGrants.filter((row) => row.nameRu.trim()).slice(0, 6)

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Способности</h3>
        <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
          полностью
        </button>
      </div>

      <div className="play-desk-compact__cards">
        {namedResources.map((row) => {
          const remaining = Math.max(0, row.max - row.used)
          return (
            <button
              key={row.id}
              type="button"
              className="play-desk-compact__card is-action"
              disabled={!onSpendResource || remaining <= 0}
              onClick={() => onSpendResource?.(row.id)}
            >
              <div className="play-desk-compact__card-meta">
                <span>{row.name}</span>
                <span className="play-desk-compact__tag">ресурс</span>
              </div>
              <p>
                {remaining}/{row.max}
                {remaining > 0 ? ' · нажми, чтобы потратить' : ' · пусто'}
              </p>
            </button>
          )
        })}

        {darkvision > 0 ? (
          <button
            type="button"
            className="play-desk-compact__card is-action"
            onClick={() =>
              onToast?.(
                `${raceName || 'Раса'}: тёмное зрение ${darkvision} фт.`,
              )
            }
          >
            <div className="play-desk-compact__card-meta">
              <span>Тёмное зрение {darkvision} фт.</span>
              <span className="play-desk-compact__tag">раса</span>
            </div>
          </button>
        ) : null}

        {topFeatures.map((feature) => (
          <button
            key={`${feature.classEntryId}:${feature.id}`}
            type="button"
            className="play-desk-compact__card is-action"
            onClick={() =>
              onToast?.(
                `${feature.name_ru}${
                  feature.scaleValue ? ` · ${feature.scaleValue}` : ''
                }${feature.summary_ru ? ` — ${feature.summary_ru}` : ''}`,
              )
            }
          >
            <div className="play-desk-compact__card-meta">
              <span>{feature.name_ru}</span>
              <span className="play-desk-compact__tag">
                {feature.source === 'subclass' ? 'подкласс' : 'класс'}
              </span>
            </div>
            <p>
              {feature.scaleValue ? `${feature.scaleValue} · ` : ''}
              {feature.summary_ru || feature.className}
            </p>
          </button>
        ))}

        {feats.map((feat) => (
          <button
            key={feat.id}
            type="button"
            className="play-desk-compact__card is-action"
            onClick={() => onToast?.(`Черта «${feat.nameRu}»`)}
          >
            <div className="play-desk-compact__card-meta">
              <span>{feat.nameRu}</span>
              <span className="play-desk-compact__tag">черта</span>
            </div>
          </button>
        ))}
      </div>

      {features.length === 0 && feats.length === 0 && namedResources.length === 0 ? (
        <p className="play-desk-compact__empty">Пока нет умений на листе</p>
      ) : null}
      {features.length > topFeatures.length ? (
        <p className="play-desk-compact__more">
          + ещё {features.length - topFeatures.length} · в полной панели
        </p>
      ) : null}
    </div>
  )
}
