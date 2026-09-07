// Fase 9 — Mail verwerken: de tussenoplossing zonder echte mailkoppeling (CLAUDE.md: "handmatig
// geplakte tekst plus goedkeuring"). Dit is bewuste, simpele patroonherkenning — geen AI/NLP —
// en levert altijd alleen een VOORSTEL op; de gebruiker beslist en keurt goed (zie App-principe).
// Puur en framework-onafhankelijk, dus los testbaar met concrete tekst- en datumvoorbeelden.
import { isoLokaal, parseIsoLokaal } from './werkdagen'

export interface MailAnalyseResultaat {
  subId?: string
  subLabel?: string
  datum?: string // isoLokaal
  bedrag?: number // hele euro's
}

const MAANDEN: Record<string, number> = {
  januari: 0,
  februari: 1,
  maart: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  augustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  december: 11,
}

/** Herkent de activiteit uit deze verbouwing waarnaar de mail het meest specifiek verwijst
 *  (langste label-match wint, om generieke woorden niet per ongeluk te laten winnen). */
export function herkenSub(tekst: string, subs: { id: string; label: string }[]): { id: string; label: string } | undefined {
  const laag = tekst.toLowerCase()
  let beste: { id: string; label: string } | undefined
  for (const sub of subs) {
    if (laag.includes(sub.label.toLowerCase()) && (!beste || sub.label.length > beste.label.length)) {
      beste = sub
    }
  }
  return beste
}

/**
 * Herkent de eerste datum in de tekst: DD-MM-JJJJ, DD/MM/JJJJ, JJJJ-MM-DD, of "15 maart (2024)".
 * Bij een datum zonder jaartal wordt het jaar van `vandaag` gebruikt; ligt de uitkomst dan meer
 * dan 3 maanden in het verleden, dan is bedoeld eerstvolgend jaar bedoeld (bijv. "in januari"
 * geschreven in november) en schuift het jaar één op.
 */
export function herkenDatum(tekst: string, vandaag: string = isoLokaal(new Date())): string | undefined {
  const numeriek = tekst.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/)
  if (numeriek) {
    const [, dag, maand, jaar] = numeriek
    return geldigeDatum(Number(jaar), Number(maand) - 1, Number(dag))
  }

  const iso = tekst.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (iso) {
    const [, jaar, maand, dag] = iso
    return geldigeDatum(Number(jaar), Number(maand) - 1, Number(dag))
  }

  const maandNamen = Object.keys(MAANDEN).join('|')
  const metMaandnaam = new RegExp(`\\b(\\d{1,2})\\s+(${maandNamen})(?:\\s+(\\d{4}))?\\b`, 'i').exec(tekst)
  if (metMaandnaam) {
    const [, dag, maandNaam, jaar] = metMaandnaam
    const maand = MAANDEN[maandNaam.toLowerCase()]
    if (jaar) return geldigeDatum(Number(jaar), maand, Number(dag))

    const vandaagDatum = parseIsoLokaal(vandaag)
    let jaarGeschat = vandaagDatum.getFullYear()
    let kandidaat = geldigeDatum(jaarGeschat, maand, Number(dag))
    if (kandidaat && parseIsoLokaal(kandidaat).getTime() < vandaagDatum.getTime() - 90 * 86_400_000) {
      jaarGeschat += 1
      kandidaat = geldigeDatum(jaarGeschat, maand, Number(dag))
    }
    return kandidaat
  }

  return undefined
}

function geldigeDatum(jaar: number, maandIndex: number, dag: number): string | undefined {
  const datum = new Date(jaar, maandIndex, dag)
  // new Date rolt ongeldige datums door (bijv. 31 februari -> begin maart) — dat is geen
  // geldige herkenning, dus verwerpen in plaats van een verkeerde datum voorstellen.
  if (datum.getFullYear() !== jaar || datum.getMonth() !== maandIndex || datum.getDate() !== dag) {
    return undefined
  }
  return isoLokaal(datum)
}

/** Herkent een bedrag ("€ 1.500", "€1.234,56", "1500 euro") en rondt af op hele euro's. */
export function herkenBedrag(tekst: string): number | undefined {
  const metTeken = tekst.match(/€\s?([\d.,]+)/)
  const metWoord = tekst.match(/([\d.,]+)\s?euro/i)
  const ruw = (metTeken ?? metWoord)?.[1]
  if (!ruw) return undefined

  const genormaliseerd = ruw.replace(/\./g, '').replace(',', '.')
  const bedrag = Number.parseFloat(genormaliseerd)
  return Number.isFinite(bedrag) ? Math.round(bedrag) : undefined
}

export function analyseerMail(tekst: string, subs: { id: string; label: string }[], vandaag?: string): MailAnalyseResultaat {
  const sub = herkenSub(tekst, subs)
  return {
    subId: sub?.id,
    subLabel: sub?.label,
    datum: herkenDatum(tekst, vandaag),
    bedrag: herkenBedrag(tekst),
  }
}
