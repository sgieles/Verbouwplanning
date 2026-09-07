// Toont de doorgerekende planning van één verbouwing, gegroepeerd per hoofdthema.
// Dit is bewust nog read-only: startdatum zetten, bevestigen, koppelen en accorderen (Laag 2/3-
// bediening) komen in fase 6. Hier voldoen we aan de Definitie van klaar van fase 5: een nieuwe
// verbouwing levert meteen een gevulde, doorgerekende planning op.
import { berekenPlanning, opleverdatum, totaleKosten } from '../domain/planner'
import type { GeplandeSub, Thema, Verbouwing } from '../domain/types'
import { effectieveBibliotheek } from '../domain/verbouwing'
import { formatteerDatumLeesbaar, isoLokaal } from '../domain/werkdagen'

interface Props {
  verbouwing: Verbouwing
  bibliotheek: Thema[]
  onTerug: () => void
}

const ANKER_MARKERING: Record<string, string> = {
  handmatig: '📌',
  bevestigd: '🔒',
  verleden: '✓',
}

function labelVoorSub(planning: GeplandeSub[], subId: string): string {
  return planning.find((p) => p.subId === subId)?.label ?? subId
}

export function PlanningOverzicht({ verbouwing, bibliotheek, onTerug }: Props) {
  const effectief = effectieveBibliotheek(bibliotheek, verbouwing.overrides)
  const planning = berekenPlanning({
    bibliotheek: effectief,
    geselecteerdeSubIds: verbouwing.geselecteerdeSubIds,
    vertrekdatumHuurder: verbouwing.vertrekdatumHuurder,
    ankers: verbouwing.ankers,
    parallelKoppelingen: verbouwing.parallelKoppelingen,
    vandaag: isoLokaal(new Date()),
  })

  const themasMetStappen = effectief
    .map((thema) => ({
      thema,
      stappen: planning.filter((p) => p.themaId === thema.id),
    }))
    .filter((groep) => groep.stappen.length > 0)

  return (
    <div className="kaart" style={{ maxWidth: 760 }}>
      <button type="button" className="knop-subtiel" onClick={onTerug} style={{ marginBottom: 12 }}>
        ← Terug
      </button>

      <h2 style={{ marginTop: 0 }}>{verbouwing.adres}</h2>

      <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
        <div>
          <div className="tekst-muted" style={{ fontSize: 12 }}>
            Verwachte oplevering
          </div>
          <div style={{ fontWeight: 600 }}>
            {opleverdatum(planning) ? formatteerDatumLeesbaar(opleverdatum(planning)!) : '—'}
          </div>
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

      {themasMetStappen.map(({ thema, stappen }) => (
        <div key={thema.id} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 14, marginBottom: 6 }}>{thema.label}</h3>
          <table>
            <thead>
              <tr>
                <th>Activiteit</th>
                <th>Start</th>
                <th>Eind</th>
                <th>Kosten</th>
              </tr>
            </thead>
            <tbody>
              {stappen.map((stap) => (
                <tr key={stap.subId}>
                  <td>
                    {stap.label}
                    {stap.gelijkMetSubId && (
                      <span className="tag" style={{ marginLeft: 8 }}>
                        gelijk met {labelVoorSub(planning, stap.gelijkMetSubId)}
                      </span>
                    )}
                  </td>
                  <td>
                    {stap.ankerBron && <span title={stap.ankerBron}>{ANKER_MARKERING[stap.ankerBron]} </span>}
                    {formatteerDatumLeesbaar(stap.start)}
                  </td>
                  <td>{formatteerDatumLeesbaar(stap.eind)}</td>
                  <td>{stap.kosten > 0 ? `€${stap.kosten.toLocaleString('nl-NL')}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
