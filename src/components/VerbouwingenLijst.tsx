// Minimale lijst zodat aangemaakte verbouwingen terug te vinden zijn. Dit is nadrukkelijk geen
// vervanging van het Overzicht-scherm (fase 7, met wachttijd-bewaking) — alleen navigatie voor nu.
import { berekenPlanning, opleverdatum, totaleKosten } from '../domain/planner'
import type { Thema, Verbouwing } from '../domain/types'
import { effectieveBibliotheek } from '../domain/verbouwing'
import { formatteerDatumLeesbaar, isoLokaal } from '../domain/werkdagen'

interface Props {
  verbouwingen: Verbouwing[]
  bibliotheek: Thema[]
  onNieuw: () => void
  onBekijk: (id: string) => void
}

export function VerbouwingenLijst({ verbouwingen, bibliotheek, onNieuw, onBekijk }: Props) {
  const vandaag = isoLokaal(new Date())

  return (
    <div className="kaart" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Verbouwingen</h2>
        <button type="button" className="knop" onClick={onNieuw}>
          + Nieuwe verbouwing
        </button>
      </div>

      {verbouwingen.length === 0 ? (
        <p className="tekst-muted">Nog geen verbouwingen aangemaakt.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Adres</th>
              <th>Verwachte oplevering</th>
              <th>Kostenprognose</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {verbouwingen.map((verbouwing) => {
              const planning = berekenPlanning({
                bibliotheek: effectieveBibliotheek(bibliotheek, verbouwing.overrides),
                geselecteerdeSubIds: verbouwing.geselecteerdeSubIds,
                vertrekdatumHuurder: verbouwing.vertrekdatumHuurder,
                ankers: verbouwing.ankers,
                parallelKoppelingen: verbouwing.parallelKoppelingen,
                vandaag,
              })
              const oplevering = opleverdatum(planning)
              return (
                <tr key={verbouwing.id}>
                  <td>{verbouwing.adres}</td>
                  <td>{oplevering ? formatteerDatumLeesbaar(oplevering) : '—'}</td>
                  <td>€{totaleKosten(planning).toLocaleString('nl-NL')}</td>
                  <td>
                    <button type="button" className="knop-subtiel" onClick={() => onBekijk(verbouwing.id)}>
                      Bekijk planning
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
