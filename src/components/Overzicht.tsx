// Fase 7 — het dagelijkse monitoring-scherm en de kernpijn van de app: in één oogopslag zien
// welke partij actie of opvolging nodig heeft, vóór het de oplevering raakt.
import { berekenPlanning, opleverdatum, totaleKosten } from '../domain/planner'
import { bepaalSignalen, bepaalVoortgang, type Signaal } from '../domain/signalering'
import type { Thema, Verbouwing } from '../domain/types'
import { effectieveBibliotheek } from '../domain/verbouwing'
import { formatteerDatumLeesbaar, isoLokaal } from '../domain/werkdagen'

interface Props {
  verbouwingen: Verbouwing[]
  bibliotheek: Thema[]
  onNieuw: () => void
  onBekijk: (id: string) => void
}

interface RegelData {
  verbouwing: Verbouwing
  themaLabelPerId: Map<string, string>
  oplevering: string | undefined
  kosten: number
  voortgang: ReturnType<typeof bepaalVoortgang>
  signalen: Signaal[]
}

function berekenRegelData(verbouwing: Verbouwing, bibliotheek: Thema[], vandaag: string): RegelData {
  const effectief = effectieveBibliotheek(bibliotheek, verbouwing.overrides)
  const planning = berekenPlanning({
    bibliotheek: effectief,
    geselecteerdeSubIds: verbouwing.geselecteerdeSubIds,
    vertrekdatumHuurder: verbouwing.vertrekdatumHuurder,
    ankers: verbouwing.ankers,
    parallelKoppelingen: verbouwing.parallelKoppelingen,
    vandaag,
  })
  return {
    verbouwing,
    themaLabelPerId: new Map(effectief.map((thema) => [thema.id, thema.label])),
    oplevering: opleverdatum(planning),
    kosten: totaleKosten(planning),
    voortgang: bepaalVoortgang(planning, vandaag),
    signalen: bepaalSignalen(planning, verbouwing.benaderdOp, vandaag),
  }
}

function StatusMarkering({ signalen }: { signalen: Signaal[] }) {
  if (signalen.length === 0) {
    return <span style={{ color: 'var(--accent)' }}>● op schema</span>
  }
  const kritiek = signalen.some((s) => s.beinvloedtOplevering)
  return (
    <span style={{ color: kritiek ? '#c0392b' : '#c9a227' }}>
      ● wacht op reactie{kritiek ? ' — dit vertraagt de oplevering' : ''}
    </span>
  )
}

function Voortgangsbalk({ voortgang, themaLabelPerId }: Pick<RegelData, 'voortgang' | 'themaLabelPerId'>) {
  const label =
    voortgang.status === 'nog-niet-gestart'
      ? 'Nog niet gestart'
      : voortgang.status === 'opgeleverd'
        ? 'Opgeleverd'
        : (voortgang.huidigeThemaId && themaLabelPerId.get(voortgang.huidigeThemaId)) || '—'

  return (
    <div>
      <div style={{ width: 140, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{ width: `${voortgang.percentage}%`, height: '100%', background: 'var(--accent)' }}
        />
      </div>
      <div className="tekst-muted" style={{ fontSize: 12, marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

export function Overzicht({ verbouwingen, bibliotheek, onNieuw, onBekijk }: Props) {
  const vandaag = isoLokaal(new Date())
  const regels = verbouwingen.map((v) => berekenRegelData(v, bibliotheek, vandaag))

  const vandaagTeDoen = regels
    .flatMap((regel) => regel.signalen.map((signaal) => ({ regel, signaal })))
    .sort((a, b) => Number(b.signaal.beinvloedtOplevering) - Number(a.signaal.beinvloedtOplevering))

  return (
    <div className="kaart" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Overzicht</h2>
        <button type="button" className="knop" onClick={onNieuw}>
          + Nieuwe verbouwing
        </button>
      </div>

      {vandaagTeDoen.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-muted)' }}>
            Vandaag te doen
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vandaagTeDoen.map(({ regel, signaal }) => (
              <button
                key={`${regel.verbouwing.id}-${signaal.subId}`}
                type="button"
                onClick={() => onBekijk(regel.verbouwing.id)}
                style={{
                  textAlign: 'left',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${signaal.beinvloedtOplevering ? '#c0392b' : '#c9a227'}`,
                  borderRadius: 4,
                  padding: '8px 12px',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'var(--text)',
                }}
              >
                <strong>{regel.verbouwing.adres}</strong> — {signaal.tekst}
                {signaal.beinvloedtOplevering && (
                  <span className="tekst-muted"> Dit vertraagt de oplevering.</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {verbouwingen.length === 0 ? (
        <p className="tekst-muted">Nog geen verbouwingen aangemaakt.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Adres</th>
              <th>Voortgang</th>
              <th>Verwachte oplevering</th>
              <th>Kostenprognose</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {regels.map((regel) => (
              <tr key={regel.verbouwing.id}>
                <td>{regel.verbouwing.adres}</td>
                <td>
                  <Voortgangsbalk voortgang={regel.voortgang} themaLabelPerId={regel.themaLabelPerId} />
                </td>
                <td>{regel.oplevering ? formatteerDatumLeesbaar(regel.oplevering) : '—'}</td>
                <td>€{regel.kosten.toLocaleString('nl-NL')}</td>
                <td>
                  <StatusMarkering signalen={regel.signalen} />
                </td>
                <td>
                  <button type="button" className="knop-subtiel" onClick={() => onBekijk(regel.verbouwing.id)}>
                    Bekijk planning
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
