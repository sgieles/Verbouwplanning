// Fase 6 — het zwaartepunt van de app: de tijdlijn tonen én alle drie de lagen bedienen
// (📌/🔒 zetten, duur bijstellen, "start gelijk met" koppelen) en de planning accorderen.
import { berekenPlanning, opleverdatum, subIdsInKetenVolgorde, totaleKosten } from '../domain/planner'
import type { Sub, Thema, Verbouwing } from '../domain/types'
import {
  accordeer,
  effectieveBibliotheek,
  verwijderAnker,
  verwijderBenaderdOp,
  verwijderKoppeling,
  zetAnker,
  zetBenaderdOp,
  zetKoppeling,
  zetOverride,
} from '../domain/verbouwing'
import { formatteerDatumLeesbaar, isoLokaal } from '../domain/werkdagen'
import { GanttTijdlijn } from './GanttTijdlijn'
import { StapActies } from './StapActies'

interface Props {
  verbouwing: Verbouwing
  bibliotheek: Thema[]
  onTerug: () => void
  onWerkBij: (updater: (verbouwing: Verbouwing) => Verbouwing) => void
}

const ANKER_MARKERING: Record<string, string> = {
  handmatig: '📌',
  bevestigd: '🔒',
  verleden: '✓',
}

export function Planning({ verbouwing, bibliotheek, onTerug, onWerkBij }: Props) {
  const effectief = effectieveBibliotheek(bibliotheek, verbouwing.overrides)
  const subsById = new Map<string, Sub>(effectief.flatMap((thema) => thema.subs.map((sub) => [sub.id, sub])))
  const vandaag = isoLokaal(new Date())

  const planning = berekenPlanning({
    bibliotheek: effectief,
    geselecteerdeSubIds: verbouwing.geselecteerdeSubIds,
    vertrekdatumHuurder: verbouwing.vertrekdatumHuurder,
    ankers: verbouwing.ankers,
    parallelKoppelingen: verbouwing.parallelKoppelingen,
    vandaag,
  })
  const ketenVolgorde = subIdsInKetenVolgorde(effectief, verbouwing.geselecteerdeSubIds)
  const oplevering = opleverdatum(planning)

  const themasMetStappen = effectief
    .map((thema) => ({ thema, stappen: planning.filter((p) => p.themaId === thema.id) }))
    .filter((groep) => groep.stappen.length > 0)

  function labelVoorSub(subId: string): string {
    return planning.find((p) => p.subId === subId)?.label ?? subId
  }

  return (
    <div className="kaart" style={{ maxWidth: 980 }}>
      <button type="button" className="knop-subtiel" onClick={onTerug} style={{ marginBottom: 12 }}>
        ← Terug
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>{verbouwing.adres}</h2>
        {verbouwing.geaccordeerd && <span className="tag">✓ vastgezet</span>}
      </div>

      <div style={{ display: 'flex', gap: 24, margin: '16px 0' }}>
        <div>
          <div className="tekst-muted" style={{ fontSize: 12 }}>
            Verwachte oplevering
          </div>
          <div style={{ fontWeight: 600 }}>{oplevering ? formatteerDatumLeesbaar(oplevering) : '—'}</div>
        </div>
        <div>
          <div className="tekst-muted" style={{ fontSize: 12 }}>
            Kostenprognose
          </div>
          <div style={{ fontWeight: 600 }}>€{totaleKosten(planning).toLocaleString('nl-NL')}</div>
        </div>
        <div>
          <div className="tekst-muted" style={{ fontSize: 12 }}>
            Aantal stappen
          </div>
          <div style={{ fontWeight: 600 }}>{planning.length}</div>
        </div>
      </div>

      {planning.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <GanttTijdlijn
            themasMetStappen={themasMetStappen}
            // Gebaseerd op de werkelijk geplande data, niet op vertrekdatumHuurder: die kan (na
            // een klem naar vandaag, of gewoon een oude invoer) ver vóór de planning liggen,
            // waardoor de tijdlijn een enorme lege periode zou proberen te tekenen.
            vanaf={planning.reduce((min, p) => (p.start < min ? p.start : min), planning[0].start)}
            totEnMet={oplevering ?? planning[0].start}
            labelVoorSub={labelVoorSub}
          />
        </div>
      )}

      {themasMetStappen.map(({ thema, stappen }) => (
        <div key={thema.id} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>{thema.label}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stappen.map((stap) => {
              const effectieveSub = subsById.get(stap.subId)
              if (!effectieveSub) return null
              const eigenIndex = ketenVolgorde.indexOf(stap.subId)
              const koppelOpties = ketenVolgorde
                .slice(0, eigenIndex)
                .map((id) => ({ id, label: labelVoorSub(id) }))

              return (
                <div key={stap.subId} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <strong>{stap.label}</strong>{' '}
                      {stap.ankerBron && <span title={stap.ankerBron}>{ANKER_MARKERING[stap.ankerBron]}</span>}{' '}
                      <span className="tekst-muted">
                        {formatteerDatumLeesbaar(stap.start)} – {formatteerDatumLeesbaar(stap.eind)}
                      </span>
                      {stap.gelijkMetSubId && (
                        <span className="tag" style={{ marginLeft: 8 }}>
                          gelijk met {labelVoorSub(stap.gelijkMetSubId)}
                        </span>
                      )}
                      {stap.wordtBepalendeFactor && (
                        <span style={{ marginLeft: 8, color: '#c0392b', fontSize: 13 }}>
                          ⚠ bepaalt nu de planning
                        </span>
                      )}
                    </div>
                    <span className="tekst-muted">{stap.kosten > 0 ? `€${stap.kosten.toLocaleString('nl-NL')}` : '—'}</span>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <StapActies
                      stap={stap}
                      effectieveSub={effectieveSub}
                      koppelOpties={koppelOpties}
                      benaderdOp={verbouwing.benaderdOp[stap.subId]}
                      onZetAnker={(bron, datum) => onWerkBij((v) => zetAnker(v, stap.subId, { bron, datum }))}
                      onVerwijderAnker={() => onWerkBij((v) => verwijderAnker(v, stap.subId))}
                      onZetDuur={(duur) => onWerkBij((v) => zetOverride(v, stap.subId, { duur }))}
                      onZetKoppeling={(gelijkMetSubId) => onWerkBij((v) => zetKoppeling(v, stap.subId, gelijkMetSubId))}
                      onVerwijderKoppeling={() => onWerkBij((v) => verwijderKoppeling(v, stap.subId))}
                      onZetBenaderdOp={(datum) => onWerkBij((v) => zetBenaderdOp(v, stap.subId, datum))}
                      onVerwijderBenaderdOp={() => onWerkBij((v) => verwijderBenaderdOp(v, stap.subId))}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="knop"
        disabled={verbouwing.geaccordeerd}
        onClick={() => onWerkBij(accordeer)}
      >
        {verbouwing.geaccordeerd ? 'Planning is vastgezet' : 'Planning vastzetten'}
      </button>
    </div>
  )
}
