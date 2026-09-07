// Puur visuele tijdlijn: positioneert balken op kalenderdagen. Geen bewerkacties hier —
// die zitten in de uitklapbare rij per stap in Planning.tsx. Zie CLAUDE.md: de Gantt is de
// held van het planning-scherm, dus rustig en dicht, geen drag-and-drop.
import type { GeplandeSub, Thema } from '../domain/types'
import { dagenTussen, formatteerDatumLeesbaar, parseIsoLokaal } from '../domain/werkdagen'

const PX_PER_DAG = 24
const LABEL_BREEDTE = 230
// Veiligheidsgrens: een verkeerd getypte datum (bijv. jaartal) mag nooit een element van
// honderdduizenden pixels breed opleveren. Ruim genoeg voor elke realistische verbouwing.
const MAX_DAGEN_BREEDTE = 3 * 366

const ANKER_MARKERING: Record<string, string> = {
  handmatig: '📌',
  bevestigd: '🔒',
  verleden: '✓',
}

interface Props {
  themasMetStappen: { thema: Thema; stappen: GeplandeSub[] }[]
  vanaf: string // isoLokaal — linkerrand van de tijdlijn
  totEnMet: string // isoLokaal — rechterrand van de tijdlijn
  labelVoorSub: (subId: string) => string
}

function positie(startIso: string, eindIso: string, vanaf: Date) {
  const start = parseIsoLokaal(startIso)
  const eind = parseIsoLokaal(eindIso)
  const links = dagenTussen(vanaf, start) * PX_PER_DAG
  const breedte = Math.max((dagenTussen(start, eind) + 1) * PX_PER_DAG, 6)
  return { links, breedte }
}

function MaandKoppen({ vanaf, totEnMet }: { vanaf: Date; totEnMet: Date }) {
  const koppen: { links: number; label: string }[] = []
  const cursor = new Date(vanaf.getFullYear(), vanaf.getMonth(), 1)
  while (cursor <= totEnMet) {
    const links = Math.max(dagenTussen(vanaf, cursor), 0) * PX_PER_DAG
    koppen.push({
      links,
      label: new Intl.DateTimeFormat('nl-NL', { month: 'short', year: 'numeric' }).format(cursor),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return (
    <div style={{ position: 'relative', height: 20, borderBottom: '1px solid var(--border)' }}>
      {koppen.map((kop) => (
        <div
          key={kop.label}
          className="tekst-muted"
          style={{ position: 'absolute', left: kop.links + 4, fontSize: 11, whiteSpace: 'nowrap' }}
        >
          {kop.label}
        </div>
      ))}
    </div>
  )
}

export function GanttTijdlijn({ themasMetStappen, vanaf, totEnMet, labelVoorSub }: Props) {
  const vanafDatum = parseIsoLokaal(vanaf)
  const totEnMetDatum = parseIsoLokaal(totEnMet)
  const dagenSpan = Math.min(Math.max(dagenTussen(vanafDatum, totEnMetDatum) + 1, 1), MAX_DAGEN_BREEDTE)
  const breedteTotaal = Math.max(dagenSpan * PX_PER_DAG, 200)

  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ width: LABEL_BREEDTE, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
        <div style={{ height: 20, borderBottom: '1px solid var(--border)' }} />
        {themasMetStappen.map(({ thema, stappen }) => (
          <div key={thema.id}>
            <div
              style={{
                height: 26,
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                fontWeight: 600,
                fontSize: 13,
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {thema.label}
            </div>
            {stappen.map((stap) => (
              <div
                key={stap.subId}
                style={{
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px 0 16px',
                  fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={stap.label}
              >
                {stap.ankerBron && <span style={{ marginRight: 4 }}>{ANKER_MARKERING[stap.ankerBron]}</span>}
                {stap.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', flex: 1 }}>
        <div style={{ width: breedteTotaal, position: 'relative' }}>
          <MaandKoppen vanaf={vanafDatum} totEnMet={totEnMetDatum} />
          {themasMetStappen.map(({ thema, stappen }) => {
            const themaStart = stappen.reduce((m, s) => (s.start < m ? s.start : m), stappen[0]?.start ?? vanaf)
            const themaEind = stappen.reduce((m, s) => (s.eind > m ? s.eind : m), stappen[0]?.eind ?? vanaf)
            const themaPos = positie(themaStart, themaEind, vanafDatum)
            const themaKosten = stappen.reduce((som, s) => som + s.kosten, 0)

            return (
              <div key={thema.id}>
                <div style={{ height: 26, position: 'relative', borderBottom: '1px solid var(--border)' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: themaPos.links,
                      width: themaPos.breedte,
                      height: 14,
                      background: 'var(--border)',
                      borderRadius: 3,
                    }}
                  />
                  <div
                    className="tekst-muted"
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: themaPos.links + themaPos.breedte + 8,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatteerDatumLeesbaar(themaStart)} – {formatteerDatumLeesbaar(themaEind)} · €
                    {themaKosten.toLocaleString('nl-NL')}
                  </div>
                </div>

                {stappen.map((stap) => {
                  const pos = positie(stap.start, stap.eind, vanafDatum)
                  const kleur = stap.wordtBepalendeFactor
                    ? 'var(--kritiek)'
                    : stap.vast
                      ? 'var(--accent)'
                      : 'color-mix(in srgb, var(--accent) 55%, var(--surface))'
                  return (
                    <div key={stap.subId} style={{ height: 28, position: 'relative', borderBottom: '1px solid var(--border)' }}>
                      <div
                        style={{
                          position: 'absolute',
                          top: 5,
                          left: pos.links,
                          width: pos.breedte,
                          height: 18,
                          background: kleur,
                          borderRadius: 3,
                        }}
                        title={`${stap.label}: ${formatteerDatumLeesbaar(stap.start)} – ${formatteerDatumLeesbaar(stap.eind)}`}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 5,
                          left: pos.links + pos.breedte + 6,
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                        }}
                      >
                        {stap.gelijkMetSubId && <span className="tag">gelijk met {labelVoorSub(stap.gelijkMetSubId)}</span>}
                        {stap.wordtBepalendeFactor && (
                          <span style={{ color: 'var(--kritiek)' }}>⚠ bepaalt nu de planning</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
