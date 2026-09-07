// De rekenkern: Laag 1 (basisvolgorde), Laag 2 (verankering) en Laag 3 (parallelliteit).
// Zie CLAUDE.md voor de volledige definitie van de drie lagen.
import type { Anker, GeplandeSub, ParallelKoppelingen, Sub, Thema } from './types'
import { eerstvolgendeWerkdag, isoLokaal, parseIsoLokaal, voegWerkdagenToe } from './werkdagen'

export interface PlanningInvoer {
  bibliotheek: Thema[]
  geselecteerdeSubIds: string[]
  vertrekdatumHuurder: string // isoLokaal
  ankers: Record<string, Anker>
  /** "Start gelijk met" per verbouwing (Laag 3). Optioneel — leeg is een puur seriële keten. */
  parallelKoppelingen?: ParallelKoppelingen
  vandaag: string // isoLokaal — expliciet meegeven i.p.v. `new Date()` zodat de functie puur en testbaar blijft
}

/** Gegooid wanneer "start gelijk met"-koppelingen een cyclus vormen (bijv. A gelijk met B, B gelijk met A). */
export class PlanningCyclusFout extends Error {
  constructor(subId: string) {
    super(`Cyclus gedetecteerd in "start gelijk met"-koppelingen bij subactiviteit "${subId}".`)
    this.name = 'PlanningCyclusFout'
  }
}

interface SubEntry {
  sub: Sub
  themaId: string
  chainVoorgangerId?: string
}

function bouwSubEntries(bibliotheek: Thema[], geselecteerdeSubIds: string[]): Map<string, SubEntry> {
  const geselecteerd = new Set(geselecteerdeSubIds)
  const inVolgorde = [...bibliotheek]
    .sort((a, b) => a.volgorde - b.volgorde)
    .flatMap((thema) =>
      thema.subs.filter((sub) => geselecteerd.has(sub.id)).map((sub) => ({ sub, themaId: thema.id })),
    )

  const entries = new Map<string, SubEntry>()
  let vorigeId: string | undefined
  for (const { sub, themaId } of inVolgorde) {
    entries.set(sub.id, { sub, themaId, chainVoorgangerId: vorigeId })
    vorigeId = sub.id
  }
  return entries
}

/**
 * Rekent de volledige planning door: Laag 1 (seriële keten), Laag 2 (ankers winnen altijd)
 * en Laag 3 ("start gelijk met" — een gekoppelde stap neemt de startdatum van zijn koppel-stap
 * over; zijn eigen opvolger blijft gewoon wachten op zijn werkelijke einddatum).
 *
 * De startdatum van elke stap volgt uit topologische afhandeling van drie mogelijke bronnen,
 * in deze prioriteit: hard anker > "start gelijk met"-koppeling > voorganger in de keten.
 */
export function berekenPlanning(invoer: PlanningInvoer): GeplandeSub[] {
  const entries = bouwSubEntries(invoer.bibliotheek, invoer.geselecteerdeSubIds)
  const koppelingen = invoer.parallelKoppelingen ?? {}
  const vandaag = parseIsoLokaal(invoer.vandaag)
  const ondergrens = eerstvolgendeWerkdag(vandaag)
  const vertrekdatum = parseIsoLokaal(invoer.vertrekdatumHuurder)

  const opgelost = new Map<string, { start: Date; eind: Date }>()
  const inBewerking = new Set<string>()

  function los(subId: string): { start: Date; eind: Date } {
    const bestaand = opgelost.get(subId)
    if (bestaand) return bestaand

    if (inBewerking.has(subId)) {
      throw new PlanningCyclusFout(subId)
    }
    inBewerking.add(subId)

    const entry = entries.get(subId)
    if (!entry) {
      throw new Error(`Onbekende subactiviteit-id in koppeling: "${subId}"`)
    }

    const anker = invoer.ankers[subId]
    const gelijkMetId = koppelingen[subId]
    const gelijkMetTarget = gelijkMetId && entries.has(gelijkMetId) ? gelijkMetId : undefined

    let start: Date
    if (anker) {
      // Laag 2: een anker staat muurvast en wint van elke koppeling.
      start = parseIsoLokaal(anker.datum)
    } else if (gelijkMetTarget) {
      // Laag 3: neem de startdatum over van de gekoppelde stap.
      start = los(gelijkMetTarget).start
    } else {
      // Laag 1: start = einde vorige stap in de keten + eigen wachttijd (geen extra dag).
      const basis = entry.chainVoorgangerId ? los(entry.chainVoorgangerId).eind : vertrekdatum
      const voorgesteld = voegWerkdagenToe(basis, entry.sub.wachttijd)
      start = voorgesteld.getTime() > ondergrens.getTime() ? voorgesteld : ondergrens
    }

    const eind = voegWerkdagenToe(start, Math.max(entry.sub.duur, 1) - 1)

    inBewerking.delete(subId)
    const resultaat = { start, eind }
    opgelost.set(subId, resultaat)
    return resultaat
  }

  const resultaat: GeplandeSub[] = []
  for (const [subId, entry] of entries) {
    const { start, eind } = los(subId)
    const anker = invoer.ankers[subId]
    const gelijkMetId = koppelingen[subId]
    const gelijkMetTarget = gelijkMetId && entries.has(gelijkMetId) ? gelijkMetId : undefined

    let ankerBron = anker?.bron
    const inHetVerleden = !anker && eind.getTime() < vandaag.getTime()
    if (inHetVerleden) {
      ankerBron = 'verleden'
    }

    resultaat.push({
      subId,
      themaId: entry.themaId,
      label: entry.sub.label,
      start: isoLokaal(start),
      eind: isoLokaal(eind),
      vast: Boolean(anker) || inHetVerleden,
      ankerBron,
      gelijkMetSubId: gelijkMetTarget,
      kosten: entry.sub.kosten,
    })
  }

  return resultaat
}

/** Einde van de keten — het maximale einde over alle stappen (parallelsporen kunnen eerder klaar zijn). */
export function opleverdatum(geplande: GeplandeSub[]): string | undefined {
  if (geplande.length === 0) return undefined
  return geplande.reduce((laatste, stap) => (stap.eind > laatste ? stap.eind : laatste), geplande[0].eind)
}

export function totaleKosten(geplande: GeplandeSub[]): number {
  return geplande.reduce((som, stap) => som + stap.kosten, 0)
}
