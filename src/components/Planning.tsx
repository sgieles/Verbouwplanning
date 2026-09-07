// Fase 6 — het zwaartepunt van de app: de tijdlijn tonen én alle drie de lagen bedienen
// (📌/🔒 zetten, duur bijstellen, "start gelijk met" koppelen) en de planning accorderen.
// Klikken op een subactiviteit in de Gantt opent een zijpaneel (links) met de bedienvelden
// ervoor — er is geen aparte lijst met dezelfde informatie meer onder de tijdlijn.
import { useState } from 'react'
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

  // Eén geselecteerde subactiviteit tegelijk: een klik op de Gantt-rij (nogmaals) opent of
  // sluit het zijpaneel met de bedienvelden ervoor.
  const [geselecteerdeSubId, setGeselecteerdeSubId] = useState<string | null>(null)

  function klikStap(subId: string) {
    setGeselecteerdeSubId((vorige) => (vorige === subId ? null : subId))
  }

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

  const geselecteerdeStap = geselecteerdeSubId ? planning.find((p) => p.subId === geselecteerdeSubId) : undefined
  const geselecteerdeSub = geselecteerdeSubId ? subsById.get(geselecteerdeSubId) : undefined
  const koppelOptiesVoorSelectie = geselecteerdeSubId
    ? ketenVolgorde.slice(0, ketenVolgorde.indexOf(geselecteerdeSubId)).map((id) => ({ id, label: labelVoorSub(id) }))
    : []

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
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
          {geselecteerdeStap && geselecteerdeSub && (
            <div className="kaart" style={{ width: 280, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong>{geselecteerdeStap.label}</strong>
                <button type="button" className="knop-subtiel" onClick={() => setGeselecteerdeSubId(null)}>
                  Sluiten
                </button>
              </div>
              <div className="tekst-muted" style={{ fontSize: 12, marginTop: 2 }}>
                {geselecteerdeStap.ankerBron && (
                  <span title={geselecteerdeStap.ankerBron}>{ANKER_MARKERING[geselecteerdeStap.ankerBron]} </span>
                )}
                {formatteerDatumLeesbaar(geselecteerdeStap.start)} – {formatteerDatumLeesbaar(geselecteerdeStap.eind)}
              </div>
              {geselecteerdeStap.gelijkMetSubId && (
                <span className="tag" style={{ marginTop: 6, display: 'inline-block' }}>
                  gelijk met {labelVoorSub(geselecteerdeStap.gelijkMetSubId)}
                </span>
              )}
              {geselecteerdeStap.wordtBepalendeFactor && (
                <div style={{ color: 'var(--kritiek)', fontSize: 12, marginTop: 6 }}>⚠ bepaalt nu de planning</div>
              )}
              {geselecteerdeStap.kosten > 0 && (
                <div className="tekst-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  €{geselecteerdeStap.kosten.toLocaleString('nl-NL')}
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />

              <StapActies
                // Zonder key blijft dit hetzelfde React-exemplaar bij het wisselen van
                // selectie (zelfde positie in de boom) en blijven de veldwaarden van de
                // vórige stap staan. De key dwingt een vers exemplaar af per subactiviteit.
                key={geselecteerdeStap.subId}
                stap={geselecteerdeStap}
                effectieveSub={geselecteerdeSub}
                koppelOpties={koppelOptiesVoorSelectie}
                benaderdOp={verbouwing.benaderdOp[geselecteerdeStap.subId]}
                onZetAnker={(bron, datum) => onWerkBij((v) => zetAnker(v, geselecteerdeStap.subId, { bron, datum }))}
                onVerwijderAnker={() => onWerkBij((v) => verwijderAnker(v, geselecteerdeStap.subId))}
                onZetDuur={(duur) => onWerkBij((v) => zetOverride(v, geselecteerdeStap.subId, { duur }))}
                onZetKoppeling={(gelijkMetSubId) =>
                  onWerkBij((v) => zetKoppeling(v, geselecteerdeStap.subId, gelijkMetSubId))
                }
                onVerwijderKoppeling={() => onWerkBij((v) => verwijderKoppeling(v, geselecteerdeStap.subId))}
                onZetBenaderdOp={(datum) => onWerkBij((v) => zetBenaderdOp(v, geselecteerdeStap.subId, datum))}
                onVerwijderBenaderdOp={() => onWerkBij((v) => verwijderBenaderdOp(v, geselecteerdeStap.subId))}
              />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <GanttTijdlijn
              themasMetStappen={themasMetStappen}
              // Gebaseerd op de werkelijk geplande data, niet op vertrekdatumHuurder: die kan (na
              // een klem naar vandaag, of gewoon een oude invoer) ver vóór de planning liggen,
              // waardoor de tijdlijn een enorme lege periode zou proberen te tekenen.
              vanaf={planning.reduce((min, p) => (p.start < min ? p.start : min), planning[0].start)}
              totEnMet={oplevering ?? planning[0].start}
              labelVoorSub={labelVoorSub}
              geselecteerdeSubId={geselecteerdeSubId}
              onKlikStap={klikStap}
            />
          </div>
        </div>
      )}

      <button type="button" className="knop" disabled={verbouwing.geaccordeerd} onClick={() => onWerkBij(accordeer)}>
        {verbouwing.geaccordeerd ? 'Planning is vastgezet' : 'Planning vastzetten'}
      </button>
    </div>
  )
}
