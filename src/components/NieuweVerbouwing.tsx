// Fase 5: adres + startdatum + keuze van werkzaamheden. Een aangevinkt hoofdthema neemt
// standaard alle subactiviteiten mee; opengeklapt kan de gebruiker losse subs uitzetten.
import { useState } from 'react'
import type { Thema } from '../domain/types'
import { isoLokaal } from '../domain/werkdagen'

interface Props {
  bibliotheek: Thema[]
  onAanmaken: (adres: string, vertrekdatumHuurder: string, geselecteerdeSubIds: string[]) => void
}

function alleSubIds(thema: Thema): string[] {
  return thema.subs.map((sub) => sub.id)
}

function ThemaRij({
  thema,
  geselecteerd,
  opengeklapt,
  onToggleThema,
  onToggleSub,
  onToggleOpengeklapt,
}: {
  thema: Thema
  geselecteerd: Set<string>
  opengeklapt: boolean
  onToggleThema: (thema: Thema, aan: boolean) => void
  onToggleSub: (subId: string, aan: boolean) => void
  onToggleOpengeklapt: () => void
}) {
  const subIds = alleSubIds(thema)
  const aantalGeselecteerd = subIds.filter((id) => geselecteerd.has(id)).length
  const alles = aantalGeselecteerd === subIds.length
  const niets = aantalGeselecteerd === 0

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={alles}
          ref={(el) => {
            if (el) el.indeterminate = !alles && !niets
          }}
          onChange={(e) => onToggleThema(thema, e.target.checked)}
          aria-label={`${thema.label} volledig ${alles ? 'uitzetten' : 'aanzetten'}`}
        />
        <button
          type="button"
          onClick={onToggleOpengeklapt}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', flex: 1, textAlign: 'left' }}
        >
          <strong>{thema.label}</strong>{' '}
          <span className="tekst-muted">
            ({aantalGeselecteerd}/{subIds.length}) {opengeklapt ? '▾' : '▸'}
          </span>
        </button>
      </div>

      {opengeklapt && (
        <div style={{ marginLeft: 26, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {thema.subs.map((sub) => (
            <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={geselecteerd.has(sub.id)}
                onChange={(e) => onToggleSub(sub.id, e.target.checked)}
              />
              {sub.label}
              <span className="tekst-muted">
                — {sub.duur}d, wachttijd {sub.wachttijd}d
                {sub.kosten > 0 ? `, €${sub.kosten.toLocaleString('nl-NL')}` : ''}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function NieuweVerbouwing({ bibliotheek, onAanmaken }: Props) {
  const [adres, setAdres] = useState('')
  const [vertrekdatum, setVertrekdatum] = useState(() => isoLokaal(new Date()))
  // Standaard alles aangevinkt: de gebruiker vinkt uit wat niet nodig is, niet andersom.
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(
    () => new Set(bibliotheek.flatMap(alleSubIds)),
  )
  const [opengeklapt, setOpengeklapt] = useState<Set<string>>(new Set())

  function toggleThema(thema: Thema, aan: boolean) {
    setGeselecteerd((vorige) => {
      const nieuw = new Set(vorige)
      for (const id of alleSubIds(thema)) {
        if (aan) nieuw.add(id)
        else nieuw.delete(id)
      }
      return nieuw
    })
  }

  function toggleSub(subId: string, aan: boolean) {
    setGeselecteerd((vorige) => {
      const nieuw = new Set(vorige)
      if (aan) nieuw.add(subId)
      else nieuw.delete(subId)
      return nieuw
    })
  }

  function toggleOpengeklapt(themaId: string) {
    setOpengeklapt((vorige) => {
      const nieuw = new Set(vorige)
      if (nieuw.has(themaId)) nieuw.delete(themaId)
      else nieuw.add(themaId)
      return nieuw
    })
  }

  const adresGeldig = adres.trim().length > 0
  const werkzaamhedenGeldig = geselecteerd.size > 0

  function versturen(e: React.FormEvent) {
    e.preventDefault()
    if (!adresGeldig || !werkzaamhedenGeldig) return
    onAanmaken(adres.trim(), vertrekdatum, [...geselecteerd])
  }

  return (
    <form onSubmit={versturen} className="kaart" style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Nieuwe verbouwing</h2>

      <div className="veld">
        <label htmlFor="adres">Adres</label>
        <input
          id="adres"
          type="text"
          value={adres}
          onChange={(e) => setAdres(e.target.value)}
          placeholder="Bijv. Lindelaan 14"
        />
      </div>

      <div className="veld">
        <label htmlFor="vertrekdatum">Vertrekdatum huurder</label>
        <input
          id="vertrekdatum"
          type="date"
          value={vertrekdatum}
          onChange={(e) => setVertrekdatum(e.target.value)}
        />
      </div>

      <div className="veld">
        <label>Werkzaamheden</label>
        <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 10px' }}>
          {bibliotheek.map((thema) => (
            <ThemaRij
              key={thema.id}
              thema={thema}
              geselecteerd={geselecteerd}
              opengeklapt={opengeklapt.has(thema.id)}
              onToggleThema={toggleThema}
              onToggleSub={toggleSub}
              onToggleOpengeklapt={() => toggleOpengeklapt(thema.id)}
            />
          ))}
        </div>
      </div>

      <button type="submit" className="knop" disabled={!adresGeldig || !werkzaamhedenGeldig}>
        Verbouwing aanmaken &amp; planning genereren
      </button>
    </form>
  )
}
