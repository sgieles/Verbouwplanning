// De bedienpaneel-rij per subactiviteit: 📌 startdatum, 🔒 bevestigen, duur bijstellen, en
// koppelen (Laag 3). Uitgeklapt vanuit Planning.tsx, ingeklapt om de tijdlijn rustig te houden.
import { useState } from 'react'
import type { GeplandeSub, Sub } from '../domain/types'
import { formatteerDatumLeesbaar, isoLokaal } from '../domain/werkdagen'

interface Props {
  stap: GeplandeSub
  effectieveSub: Sub
  koppelOpties: { id: string; label: string }[]
  benaderdOp?: string
  /** Open/dicht wordt in Planning.tsx bijgehouden, zodat ook een klik op de Gantt-rij hetzelfde paneel opent. */
  opengeklapt: boolean
  onToggle: () => void
  onZetAnker: (bron: 'handmatig' | 'bevestigd', datum: string) => void
  onVerwijderAnker: () => void
  onZetDuur: (duur: number) => void
  onZetKoppeling: (gelijkMetSubId: string) => void
  onVerwijderKoppeling: () => void
  onZetBenaderdOp: (datum: string) => void
  onVerwijderBenaderdOp: () => void
}

export function StapActies({
  stap,
  effectieveSub,
  koppelOpties,
  benaderdOp,
  opengeklapt,
  onToggle,
  onZetAnker,
  onVerwijderAnker,
  onZetDuur,
  onZetKoppeling,
  onVerwijderKoppeling,
  onZetBenaderdOp,
  onVerwijderBenaderdOp,
}: Props) {
  const [startdatumVeld, setStartdatumVeld] = useState(stap.start)
  const [bevestigdatumVeld, setBevestigdatumVeld] = useState(stap.start)
  const [duurVeld, setDuurVeld] = useState(String(effectieveSub.duur))
  const [koppelVeld, setKoppelVeld] = useState(stap.gelijkMetSubId ?? '')
  const [benaderdVeld, setBenaderdVeld] = useState(() => benaderdOp ?? isoLokaal(new Date()))

  // Harde regel (CLAUDE.md): verstreken stappen staan vast en tonen geen bewerkacties.
  if (stap.ankerBron === 'verleden') {
    return (
      <span className="tag" title="Deze stap ligt in het verleden en staat vast">
        ✓ afgerond
      </span>
    )
  }

  return (
    <div>
      <button type="button" className="knop-subtiel" onClick={onToggle}>
        {opengeklapt ? 'Sluiten ▴' : 'Bewerken ▾'}
      </button>

      {opengeklapt && (
        <div
          className="kaart"
          style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}
        >
          <div className="veldrij">
            <span>📌 Startdatum zetten</span>
            <input
              type="date"
              aria-label="Startdatum"
              value={startdatumVeld}
              onChange={(e) => setStartdatumVeld(e.target.value)}
            />
            <button type="button" className="knop-subtiel" onClick={() => onZetAnker('handmatig', startdatumVeld)}>
              Zet startdatum
            </button>
            {stap.ankerBron === 'handmatig' && (
              <button type="button" className="knop-subtiel" onClick={onVerwijderAnker}>
                Maak los
              </button>
            )}
          </div>

          <div className="veldrij">
            <span>🔒 Bevestigen door partij</span>
            <input
              type="date"
              aria-label="Toegezegde datum"
              value={bevestigdatumVeld}
              onChange={(e) => setBevestigdatumVeld(e.target.value)}
            />
            <button
              type="button"
              className="knop-subtiel"
              onClick={() => onZetAnker('bevestigd', bevestigdatumVeld)}
            >
              Bevestig toegezegde datum
            </button>
            {stap.ankerBron === 'bevestigd' && (
              <button type="button" className="knop-subtiel" onClick={onVerwijderAnker}>
                Maak los
              </button>
            )}
          </div>

          <div className="veldrij">
            <span>📞 Benaderd op</span>
            <input
              type="date"
              aria-label="Benaderd op"
              value={benaderdVeld}
              onChange={(e) => setBenaderdVeld(e.target.value)}
            />
            <button type="button" className="knop-subtiel" onClick={() => onZetBenaderdOp(benaderdVeld)}>
              Markeer benaderd
            </button>
            {benaderdOp && (
              <>
                <span className="tekst-muted">sinds {formatteerDatumLeesbaar(benaderdOp)}</span>
                <button type="button" className="knop-subtiel" onClick={onVerwijderBenaderdOp}>
                  Wis
                </button>
              </>
            )}
          </div>

          <div className="veldrij">
            <span>Duur bijstellen (werkdagen)</span>
            <input
              type="number"
              aria-label="Duur in werkdagen"
              min={1}
              value={duurVeld}
              onChange={(e) => setDuurVeld(e.target.value)}
              style={{ width: 70 }}
            />
            <button
              type="button"
              className="knop-subtiel"
              onClick={() => {
                const n = Number(duurVeld)
                if (Number.isFinite(n) && n >= 1) onZetDuur(n)
              }}
            >
              Toepassen
            </button>
          </div>

          <div className="veldrij">
            <span>Start gelijk met</span>
            <select
              aria-label="Start gelijk met"
              value={koppelVeld}
              onChange={(e) => setKoppelVeld(e.target.value)}
              disabled={koppelOpties.length === 0}
            >
              <option value="">— geen koppeling —</option>
              {koppelOpties.map((optie) => (
                <option key={optie.id} value={optie.id}>
                  {optie.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="knop-subtiel"
              disabled={!koppelVeld}
              onClick={() => onZetKoppeling(koppelVeld)}
            >
              Koppel
            </button>
            {stap.gelijkMetSubId && (
              <button
                type="button"
                className="knop-subtiel"
                onClick={() => {
                  setKoppelVeld('')
                  onVerwijderKoppeling()
                }}
              >
                Ontkoppel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
