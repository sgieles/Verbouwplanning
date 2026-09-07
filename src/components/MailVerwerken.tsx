// Fase 9 — de tussenoplossing zonder echte mailkoppeling. Analyseert geplakte tekst tot een
// concreet voorstel (activiteit, datum, eventueel bedrag), toont het effect als diff op de
// planning, en voert het pas door na expliciete goedkeuring — nooit stilzwijgend (CLAUDE.md).
import { useMemo, useState } from 'react'
import { analyseerMail } from '../domain/mailAnalyse'
import { berekenPlanning, opleverdatum, subIdsInKetenVolgorde, totaleKosten } from '../domain/planner'
import type { Thema, Verbouwing } from '../domain/types'
import { effectieveBibliotheek, zetAnker, zetOverride } from '../domain/verbouwing'
import { formatteerDatumLeesbaar, isoLokaal } from '../domain/werkdagen'

interface Props {
  bibliotheek: Thema[]
  verbouwingen: Verbouwing[]
  onWerkBij: (id: string, updater: (verbouwing: Verbouwing) => Verbouwing) => void
}

function berekenVoorPlanning(verbouwing: Verbouwing, bibliotheek: Thema[], vandaag: string) {
  const effectief = effectieveBibliotheek(bibliotheek, verbouwing.overrides)
  return berekenPlanning({
    bibliotheek: effectief,
    geselecteerdeSubIds: verbouwing.geselecteerdeSubIds,
    vertrekdatumHuurder: verbouwing.vertrekdatumHuurder,
    ankers: verbouwing.ankers,
    parallelKoppelingen: verbouwing.parallelKoppelingen,
    vandaag,
  })
}

export function MailVerwerken({ bibliotheek, verbouwingen, onWerkBij }: Props) {
  const vandaag = isoLokaal(new Date())
  const [verbouwingId, setVerbouwingId] = useState('')
  const [mailTekst, setMailTekst] = useState('')
  const [geanalyseerd, setGeanalyseerd] = useState(false)
  const [subId, setSubId] = useState('')
  const [datum, setDatum] = useState('')
  const [bedragVeld, setBedragVeld] = useState('')
  const [zojuistGoedgekeurd, setZojuistGoedgekeurd] = useState(false)

  const verbouwing = verbouwingen.find((v) => v.id === verbouwingId)
  const effectief = verbouwing ? effectieveBibliotheek(bibliotheek, verbouwing.overrides) : []
  const kandidaatSubs = useMemo(
    () =>
      verbouwing
        ? subIdsInKetenVolgorde(effectief, verbouwing.geselecteerdeSubIds).map((id) => ({
            id,
            label: effectief.flatMap((t) => t.subs).find((s) => s.id === id)?.label ?? id,
          }))
        : [],
    [verbouwing, bibliotheek],
  )

  function analyseer() {
    if (!verbouwing) return
    const resultaat = analyseerMail(mailTekst, kandidaatSubs, vandaag)
    setSubId(resultaat.subId ?? '')
    setDatum(resultaat.datum ?? '')
    setBedragVeld(resultaat.bedrag !== undefined ? String(resultaat.bedrag) : '')
    setGeanalyseerd(true)
    setZojuistGoedgekeurd(false)
  }

  function negeer() {
    setGeanalyseerd(false)
    setMailTekst('')
    setSubId('')
    setDatum('')
    setBedragVeld('')
  }

  function keurGoed() {
    if (!verbouwing || !subId || !datum) return
    const bedrag = bedragVeld.trim() === '' ? undefined : Number(bedragVeld)
    onWerkBij(verbouwing.id, (v) => {
      let bijgewerkt = zetAnker(v, subId, { bron: 'bevestigd', datum })
      if (bedrag !== undefined && Number.isFinite(bedrag)) {
        bijgewerkt = zetOverride(bijgewerkt, subId, { kosten: bedrag })
      }
      return bijgewerkt
    })
    setZojuistGoedgekeurd(true)
    negeer()
  }

  const huidigePlanning = verbouwing ? berekenVoorPlanning(verbouwing, bibliotheek, vandaag) : []
  const voorgesteldePlanning =
    verbouwing && subId && datum
      ? berekenVoorPlanning(
          (() => {
            const bedrag = bedragVeld.trim() === '' ? undefined : Number(bedragVeld)
            let hypothetisch = zetAnker(verbouwing, subId, { bron: 'bevestigd', datum })
            if (bedrag !== undefined && Number.isFinite(bedrag)) {
              hypothetisch = zetOverride(hypothetisch, subId, { kosten: bedrag })
            }
            return hypothetisch
          })(),
          bibliotheek,
          vandaag,
        )
      : null

  const huidigeOplevering = opleverdatum(huidigePlanning)
  const voorgesteldeOplevering = voorgesteldePlanning ? opleverdatum(voorgesteldePlanning) : undefined
  const huidigeKosten = totaleKosten(huidigePlanning)
  const voorgesteldeKosten = voorgesteldePlanning ? totaleKosten(voorgesteldePlanning) : undefined

  return (
    <div className="kaart" style={{ maxWidth: 700 }}>
      <h2 style={{ marginTop: 0 }}>Mail verwerken</h2>
      <p className="tekst-muted" style={{ marginTop: -8 }}>
        Plak een ontvangen mail, koppel hem aan een woning, en beoordeel het voorstel. Er wordt
        niets doorgevoerd zonder jouw goedkeuring.
      </p>

      {zojuistGoedgekeurd && (
        <div className="tag" style={{ marginBottom: 12, display: 'inline-block' }}>
          ✓ Voorstel goedgekeurd en verwerkt in de planning
        </div>
      )}

      <div className="veld">
        <label htmlFor="woning">Woning</label>
        <select
          id="woning"
          value={verbouwingId}
          onChange={(e) => {
            setVerbouwingId(e.target.value)
            negeer()
          }}
        >
          <option value="">— kies een woning —</option>
          {verbouwingen.map((v) => (
            <option key={v.id} value={v.id}>
              {v.adres}
            </option>
          ))}
        </select>
      </div>

      <div className="veld">
        <label htmlFor="mailtekst">Mailtekst</label>
        <textarea
          id="mailtekst"
          rows={8}
          value={mailTekst}
          onChange={(e) => setMailTekst(e.target.value)}
          placeholder="Plak hier de ontvangen mail…"
          disabled={!verbouwing}
        />
      </div>

      <button type="button" className="knop" disabled={!verbouwing || !mailTekst.trim()} onClick={analyseer}>
        Analyseer
      </button>

      {geanalyseerd && verbouwing && (
        <div className="kaart" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Voorstel</h3>

          <div className="veld">
            <label htmlFor="voorstel-sub">Activiteit</label>
            <select id="voorstel-sub" value={subId} onChange={(e) => setSubId(e.target.value)}>
              <option value="">— niet herkend, kies handmatig —</option>
              {kandidaatSubs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          <div className="veld">
            <label htmlFor="voorstel-datum">Toegezegde datum</label>
            <input id="voorstel-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>

          <div className="veld">
            <label htmlFor="voorstel-bedrag">Kostenwijziging (optioneel, in hele euro's)</label>
            <input
              id="voorstel-bedrag"
              type="number"
              min={0}
              value={bedragVeld}
              onChange={(e) => setBedragVeld(e.target.value)}
              placeholder="ongewijzigd"
            />
          </div>

          {!subId && (
            <p className="tekst-muted">Geen activiteit herkend in deze mail — kies er zelf een om door te kunnen gaan.</p>
          )}
          {!datum && subId && (
            <p className="tekst-muted">Geen datum herkend in deze mail — vul de toegezegde datum handmatig in.</p>
          )}

          <div className="kaart" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div className="tekst-muted" style={{ fontSize: 12 }}>
                  Oplevering
                </div>
                <div>
                  {huidigeOplevering ? formatteerDatumLeesbaar(huidigeOplevering) : '—'}
                  {voorgesteldeOplevering && voorgesteldeOplevering !== huidigeOplevering && (
                    <>
                      {' → '}
                      <strong>{formatteerDatumLeesbaar(voorgesteldeOplevering)}</strong>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="tekst-muted" style={{ fontSize: 12 }}>
                  Kosten
                </div>
                <div>
                  €{huidigeKosten.toLocaleString('nl-NL')}
                  {voorgesteldeKosten !== undefined && voorgesteldeKosten !== huidigeKosten && (
                    <>
                      {' → '}
                      <strong>€{voorgesteldeKosten.toLocaleString('nl-NL')}</strong>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="button" className="knop" disabled={!subId || !datum} onClick={keurGoed}>
              Goedkeuren
            </button>
            <button type="button" className="knop-subtiel" onClick={negeer}>
              Negeren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

