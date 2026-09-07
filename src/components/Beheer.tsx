// Fase 8 — onderhoud van de activiteiten-bibliotheek. Archiveren i.p.v. hard verwijderen zodra
// een activiteit in gebruik is (CLAUDE.md: data-integriteit boven gemak); nieuwe activiteiten
// verschijnen direct bij "Nieuwe verbouwing" (via beschikbareThemas, elders gefilterd).
import { useState } from 'react'
import {
  archiveerSub,
  archiveerThema,
  heractiveerSub,
  heractiveerThema,
  themaIsInGebruik,
  verwijderSub,
  verwijderThema,
  voegSubToe,
  voegThemaToe,
  wijzigSub,
  wijzigThema,
} from '../domain/bibliotheek'
import type { Groep, Sub, Thema, Verbouwing } from '../domain/types'

interface Props {
  bibliotheek: Thema[]
  verbouwingen: Verbouwing[]
  onWerkBij: (updater: (bibliotheek: Thema[]) => Thema[]) => void
}

const GROEPEN: Groep[] = ['Voorbereiding', 'Afwerking', 'Oplevering']

function SubRij({
  sub,
  aantalInGebruik,
  onWijzig,
  onArchiveer,
  onHeractiveer,
  onVerwijder,
}: {
  sub: Sub
  aantalInGebruik: number
  onWijzig: (wijzigingen: Partial<Pick<Sub, 'label' | 'duur' | 'wachttijd' | 'kosten'>>) => void
  onArchiveer: () => void
  onHeractiveer: () => void
  onVerwijder: () => void
}) {
  const [opengeklapt, setOpengeklapt] = useState(false)
  const [label, setLabel] = useState(sub.label)
  const [duur, setDuur] = useState(String(sub.duur))
  const [wachttijd, setWachttijd] = useState(String(sub.wachttijd))
  const [kosten, setKosten] = useState(String(sub.kosten))
  const [wachtOpBevestiging, setWachtOpBevestiging] = useState(false)
  const [vraagVerwijderBevestiging, setVraagVerwijderBevestiging] = useState(false)

  function huidigeWaarden() {
    return { label, duur: Number(duur), wachttijd: Number(wachttijd), kosten: Number(kosten) }
  }

  function opslaan() {
    const waarden = huidigeWaarden()
    const rekenraakt = waarden.duur !== sub.duur || waarden.wachttijd !== sub.wachttijd
    if (rekenraakt && aantalInGebruik > 0 && !wachtOpBevestiging) {
      setWachtOpBevestiging(true)
      return
    }
    onWijzig(waarden)
    setWachtOpBevestiging(false)
    setOpengeklapt(false)
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ opacity: sub.gearchiveerd ? 0.5 : 1 }}>
          {sub.label}
          <span className="tekst-muted" style={{ marginLeft: 8 }}>
            {sub.duur}d · wachttijd {sub.wachttijd}d
            {sub.kosten > 0 ? ` · €${sub.kosten.toLocaleString('nl-NL')}` : ''}
          </span>
          {sub.gearchiveerd && <span className="tag" style={{ marginLeft: 8 }}>gearchiveerd</span>}
          {aantalInGebruik > 0 && (
            <span className="tekst-muted" style={{ marginLeft: 8 }}>
              — in {aantalInGebruik} verbouwing{aantalInGebruik === 1 ? '' : 'en'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {vraagVerwijderBevestiging ? (
            <>
              <span className="tekst-muted" style={{ alignSelf: 'center' }}>
                Verwijderen kan niet ongedaan gemaakt worden.
              </span>
              <button type="button" className="knop-subtiel" onClick={onVerwijder}>
                Ja, verwijder
              </button>
              <button type="button" className="knop-subtiel" onClick={() => setVraagVerwijderBevestiging(false)}>
                Annuleren
              </button>
            </>
          ) : (
            <>
              <button type="button" className="knop-subtiel" onClick={() => setOpengeklapt((v) => !v)}>
                {opengeklapt ? 'Sluiten' : 'Bewerken'}
              </button>
              {sub.gearchiveerd ? (
                <button type="button" className="knop-subtiel" onClick={onHeractiveer}>
                  Heractiveer
                </button>
              ) : (
                <button type="button" className="knop-subtiel" onClick={onArchiveer}>
                  Archiveer
                </button>
              )}
              {aantalInGebruik === 0 && (
                <button type="button" className="knop-subtiel" onClick={() => setVraagVerwijderBevestiging(true)}>
                  Verwijder
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {opengeklapt && (
        <div className="bewerk-paneel">
          <input aria-label="Label" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: 180 }} />
          <label>
            Duur{' '}
            <input
              aria-label="Duur"
              type="number"
              min={1}
              value={duur}
              onChange={(e) => setDuur(e.target.value)}
              style={{ width: 55 }}
            />
          </label>
          <label>
            Wachttijd{' '}
            <input
              aria-label="Wachttijd"
              type="number"
              min={0}
              value={wachttijd}
              onChange={(e) => setWachttijd(e.target.value)}
              style={{ width: 55 }}
            />
          </label>
          <label>
            Kosten €{' '}
            <input
              aria-label="Kosten"
              type="number"
              min={0}
              value={kosten}
              onChange={(e) => setKosten(e.target.value)}
              style={{ width: 75 }}
            />
          </label>
          <button type="button" className="knop-subtiel" onClick={opslaan}>
            Opslaan
          </button>

          {wachtOpBevestiging && (
            <div className="kaart" style={{ width: '100%', fontSize: 13 }}>
              Deze activiteit wordt gebruikt in {aantalInGebruik} lopende verbouwing{aantalInGebruik === 1 ? '' : 'en'}.
              Deze wijziging past ook hún planning aan — tenzij die verbouwing hier al een eigen aanpassing voor
              heeft ingesteld. Wil je de bibliotheek toch aanpassen?
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <button type="button" className="knop-subtiel" onClick={opslaan}>
                  Ja, bibliotheek aanpassen
                </button>
                <button type="button" className="knop-subtiel" onClick={() => setWachtOpBevestiging(false)}>
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NieuwSubForm({ onToevoegen }: { onToevoegen: (input: { label: string; duur: number; wachttijd: number; kosten: number }) => void }) {
  const [opengeklapt, setOpengeklapt] = useState(false)
  const [label, setLabel] = useState('')
  const [duur, setDuur] = useState('1')
  const [wachttijd, setWachttijd] = useState('0')
  const [kosten, setKosten] = useState('0')

  if (!opengeklapt) {
    return (
      <button type="button" className="knop-subtiel" onClick={() => setOpengeklapt(true)}>
        + subactiviteit
      </button>
    )
  }

  return (
    <div className="bewerk-paneel">
      <input
        aria-label="Nieuwe subactiviteit label"
        placeholder="Naam"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        style={{ width: 180 }}
      />
      <label>
        Duur <input aria-label="Nieuwe subactiviteit duur" type="number" min={1} value={duur} onChange={(e) => setDuur(e.target.value)} style={{ width: 55 }} />
      </label>
      <label>
        Wachttijd{' '}
        <input aria-label="Nieuwe subactiviteit wachttijd" type="number" min={0} value={wachttijd} onChange={(e) => setWachttijd(e.target.value)} style={{ width: 55 }} />
      </label>
      <label>
        Kosten €{' '}
        <input aria-label="Nieuwe subactiviteit kosten" type="number" min={0} value={kosten} onChange={(e) => setKosten(e.target.value)} style={{ width: 75 }} />
      </label>
      <button
        type="button"
        className="knop-subtiel"
        disabled={!label.trim()}
        onClick={() => {
          onToevoegen({ label: label.trim(), duur: Number(duur), wachttijd: Number(wachttijd), kosten: Number(kosten) })
          setLabel('')
          setDuur('1')
          setWachttijd('0')
          setKosten('0')
          setOpengeklapt(false)
        }}
      >
        Toevoegen
      </button>
      <button type="button" className="knop-subtiel" onClick={() => setOpengeklapt(false)}>
        Annuleren
      </button>
    </div>
  )
}

function ThemaHeader({
  thema,
  onWijzig,
  onArchiveer,
  onHeractiveer,
  onVerwijder,
  kanVerwijderen,
}: {
  thema: Thema
  onWijzig: (wijzigingen: Partial<Pick<Thema, 'label' | 'groep' | 'volgorde'>>) => void
  onArchiveer: () => void
  onHeractiveer: () => void
  onVerwijder: () => void
  kanVerwijderen: boolean
}) {
  const [opengeklapt, setOpengeklapt] = useState(false)
  const [label, setLabel] = useState(thema.label)
  const [groep, setGroep] = useState<Groep>(thema.groep)
  const [volgorde, setVolgorde] = useState(String(thema.volgorde))
  const [vraagVerwijderBevestiging, setVraagVerwijderBevestiging] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{thema.label}</strong>
          <span className="tekst-muted" style={{ marginLeft: 8 }}>
            {thema.groep} · volgorde {thema.volgorde}
          </span>
          {thema.gearchiveerd && <span className="tag" style={{ marginLeft: 8 }}>gearchiveerd</span>}
        </div>
        {vraagVerwijderBevestiging ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="tekst-muted">Verwijdert het hele thema — kan niet ongedaan gemaakt worden.</span>
            <button type="button" className="knop-subtiel" onClick={onVerwijder}>
              Ja, verwijder
            </button>
            <button type="button" className="knop-subtiel" onClick={() => setVraagVerwijderBevestiging(false)}>
              Annuleren
            </button>
          </div>
        ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="knop-subtiel" onClick={() => setOpengeklapt((v) => !v)}>
            {opengeklapt ? 'Sluiten' : 'Bewerken'}
          </button>
          {thema.gearchiveerd ? (
            <button type="button" className="knop-subtiel" onClick={onHeractiveer}>
              Heractiveer
            </button>
          ) : (
            <button type="button" className="knop-subtiel" onClick={onArchiveer}>
              Archiveer
            </button>
          )}
          {kanVerwijderen && (
            <button type="button" className="knop-subtiel" onClick={() => setVraagVerwijderBevestiging(true)}>
              Verwijder
            </button>
          )}
        </div>
        )}
      </div>

      {opengeklapt && (
        <div className="bewerk-paneel">
          <input aria-label="Thema label" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: 200 }} />
          <select aria-label="Thema groep" value={groep} onChange={(e) => setGroep(e.target.value as Groep)}>
            {GROEPEN.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <label>
            Volgorde{' '}
            <input aria-label="Thema volgorde" type="number" step={10} value={volgorde} onChange={(e) => setVolgorde(e.target.value)} style={{ width: 65 }} />
          </label>
          <button
            type="button"
            className="knop-subtiel"
            onClick={() => {
              onWijzig({ label, groep, volgorde: Number(volgorde) })
              setOpengeklapt(false)
            }}
          >
            Opslaan
          </button>
        </div>
      )}
    </>
  )
}

function NieuwThemaForm({ onToevoegen }: { onToevoegen: (input: { label: string; groep: Groep; volgorde: number }) => void }) {
  const [opengeklapt, setOpengeklapt] = useState(false)
  const [label, setLabel] = useState('')
  const [groep, setGroep] = useState<Groep>('Afwerking')
  const [volgorde, setVolgorde] = useState('10')

  if (!opengeklapt) {
    return (
      <button type="button" className="knop" onClick={() => setOpengeklapt(true)}>
        + Nieuw hoofdthema
      </button>
    )
  }

  return (
    <div className="kaart" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
      <input aria-label="Nieuw thema label" placeholder="Naam hoofdthema" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: 200 }} />
      <select aria-label="Nieuw thema groep" value={groep} onChange={(e) => setGroep(e.target.value as Groep)}>
        {GROEPEN.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <label>
        Volgorde <input aria-label="Nieuw thema volgorde" type="number" step={10} value={volgorde} onChange={(e) => setVolgorde(e.target.value)} style={{ width: 65 }} />
      </label>
      <button
        type="button"
        className="knop-subtiel"
        disabled={!label.trim()}
        onClick={() => {
          onToevoegen({ label: label.trim(), groep, volgorde: Number(volgorde) })
          setLabel('')
          setVolgorde('10')
          setOpengeklapt(false)
        }}
      >
        Toevoegen
      </button>
      <button type="button" className="knop-subtiel" onClick={() => setOpengeklapt(false)}>
        Annuleren
      </button>
    </div>
  )
}

export function Beheer({ bibliotheek, verbouwingen, onWerkBij }: Props) {
  const inGebruikTeller = (subId: string) => verbouwingen.filter((v) => v.geselecteerdeSubIds.includes(subId)).length

  return (
    <div className="kaart" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Beheer</h2>
        <NieuwThemaForm onToevoegen={(input) => onWerkBij((b) => voegThemaToe(b, input))} />
      </div>

      {[...bibliotheek].sort((a, b) => a.volgorde - b.volgorde).map((thema) => (
        <div key={thema.id} className="kaart" style={{ marginBottom: 12, opacity: thema.gearchiveerd ? 0.6 : 1 }}>
          <ThemaHeader
            thema={thema}
            kanVerwijderen={!themaIsInGebruik(thema, verbouwingen)}
            onWijzig={(wijzigingen) => onWerkBij((b) => wijzigThema(b, thema.id, wijzigingen))}
            onArchiveer={() => onWerkBij((b) => archiveerThema(b, thema.id))}
            onHeractiveer={() => onWerkBij((b) => heractiveerThema(b, thema.id))}
            onVerwijder={() => onWerkBij((b) => verwijderThema(b, thema.id))}
          />

          <div style={{ marginTop: 8, marginLeft: 8 }}>
            {thema.subs.map((sub) => (
              <SubRij
                key={sub.id}
                sub={sub}
                aantalInGebruik={inGebruikTeller(sub.id)}
                onWijzig={(wijzigingen) => onWerkBij((b) => wijzigSub(b, sub.id, wijzigingen))}
                onArchiveer={() => onWerkBij((b) => archiveerSub(b, sub.id))}
                onHeractiveer={() => onWerkBij((b) => heractiveerSub(b, sub.id))}
                onVerwijder={() => onWerkBij((b) => verwijderSub(b, sub.id))}
              />
            ))}
            <div style={{ marginTop: 6 }}>
              <NieuwSubForm onToevoegen={(input) => onWerkBij((b) => voegSubToe(b, thema.id, input))} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
