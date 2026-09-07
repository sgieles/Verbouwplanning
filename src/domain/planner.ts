// De rekenkern: Laag 1 (basisvolgorde) + Laag 2 (verankering).
// Laag 3 (parallelliteit op subactiviteit-niveau) komt in fase 3 — zie BUILDPLAN.md — en zit hier nog niet in.
import type { Anker, GeplandeSub, Sub, Thema } from './types'
import { eerstvolgendeWerkdag, isoLokaal, parseIsoLokaal, voegWerkdagenToe } from './werkdagen'

export interface PlanningInvoer {
  bibliotheek: Thema[]
  geselecteerdeSubIds: string[]
  vertrekdatumHuurder: string // isoLokaal
  ankers: Record<string, Anker>
  vandaag: string // isoLokaal — expliciet meegeven i.p.v. `new Date()` zodat de functie puur en testbaar blijft
}

interface SubMetThema {
  sub: Sub
  themaId: string
}

function geselecteerdeSubsInVolgorde(
  bibliotheek: Thema[],
  geselecteerdeSubIds: string[],
): SubMetThema[] {
  const geselecteerd = new Set(geselecteerdeSubIds)
  return [...bibliotheek]
    .sort((a, b) => a.volgorde - b.volgorde)
    .flatMap((thema) =>
      thema.subs
        .filter((sub) => geselecteerd.has(sub.id))
        .map((sub) => ({ sub, themaId: thema.id })),
    )
}

/**
 * Rekent de seriële keten door: elke stap start na (einde vorige + eigen wachttijd),
 * tenzij er een anker (handmatig/bevestigd/verleden) is — dan geldt Laag 2 en schuift de rest mee.
 * Een niet-verankerde stap landt nooit vóór vandaag (geklemd op de eerstvolgende werkdag).
 */
export function berekenPlanning(invoer: PlanningInvoer): GeplandeSub[] {
  const subs = geselecteerdeSubsInVolgorde(invoer.bibliotheek, invoer.geselecteerdeSubIds)
  const vandaag = parseIsoLokaal(invoer.vandaag)
  const ondergrens = eerstvolgendeWerkdag(vandaag)

  let cursor = parseIsoLokaal(invoer.vertrekdatumHuurder)
  const resultaat: GeplandeSub[] = []

  for (const { sub, themaId } of subs) {
    const anker = invoer.ankers[sub.id]
    let start: Date
    let ankerBron = anker?.bron

    if (anker) {
      // Laag 2: een anker staat muurvast, ongeacht wat de keten zou voorstellen.
      start = parseIsoLokaal(anker.datum)
    } else {
      // Laag 1: start = einde vorige stap + eigen wachttijd (geen extra dag).
      const voorgesteld = voegWerkdagenToe(cursor, sub.wachttijd)
      start = voorgesteld.getTime() > ondergrens.getTime() ? voorgesteld : ondergrens
    }

    const eind = voegWerkdagenToe(start, Math.max(sub.duur, 1) - 1)
    const inHetVerleden = !anker && eind.getTime() < vandaag.getTime()
    if (inHetVerleden) {
      ankerBron = 'verleden'
    }

    resultaat.push({
      subId: sub.id,
      themaId,
      label: sub.label,
      start: isoLokaal(start),
      eind: isoLokaal(eind),
      vast: Boolean(anker) || inHetVerleden,
      ankerBron,
      kosten: sub.kosten,
    })

    cursor = eind
  }

  return resultaat
}

/** Einde van de seriële keten — niet zomaar het laatste array-element (fase 3 voegt parallelsporen toe die eerder klaar kunnen zijn). */
export function opleverdatum(geplande: GeplandeSub[]): string | undefined {
  if (geplande.length === 0) return undefined
  return geplande.reduce((laatste, stap) => (stap.eind > laatste ? stap.eind : laatste), geplande[0].eind)
}

export function totaleKosten(geplande: GeplandeSub[]): number {
  return geplande.reduce((som, stap) => som + stap.kosten, 0)
}
