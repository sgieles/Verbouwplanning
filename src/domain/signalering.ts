// Wachttijd-bewaking (fase 7) — de kernpijn uit CLAUDE.md: welke partij heeft actie of
// opvolging nodig? Puur en getest met concrete datums, net als de rest van de rekenkern.
import { opleverdatum } from './planner'
import type { GeplandeSub } from './types'
import { dagenTussen, parseIsoLokaal } from './werkdagen'

/** Binnen dit aantal kalenderdagen (of eerder) geldt een onbevestigde stap als "nadert". */
export const NADERT_DREMPEL_DAGEN = 5
/** Vanaf dit aantal kalenderdagen zonder reactie na "benaderd op" geldt een stap als "wacht te lang". */
export const WACHT_OP_REACTIE_DREMPEL_DAGEN = 5

export type SignaalType = 'nadert-onbevestigd' | 'wacht-op-reactie'

export interface Signaal {
  subId: string
  themaId: string
  label: string
  type: SignaalType
  tekst: string
  /** Schuift de oplevering mee als deze stap vertraagt (zie CLAUDE.md Laag 3: een gekoppelde
   *  stap die niet zelf bepalend is geworden, raakt de opvolger niet). */
  beinvloedtOplevering: boolean
}

/**
 * Detecteert per stap of er actie of opvolging nodig is:
 * - "wacht-op-reactie": een partij is benaderd maar heeft te lang niet gereageerd (nog geen 🔒).
 * - "nadert-onbevestigd": de start nadert (of is er al) zonder dat er enige toezegging is.
 * Verstreken (✓) en al bevestigde (🔒) stappen leveren geen signaal op.
 */
export function bepaalSignalen(
  planning: GeplandeSub[],
  benaderdOp: Record<string, string>,
  vandaag: string,
): Signaal[] {
  const vandaagDatum = parseIsoLokaal(vandaag)
  const signalen: Signaal[] = []

  for (const stap of planning) {
    if (stap.ankerBron === 'verleden' || stap.ankerBron === 'bevestigd') continue

    const beinvloedtOplevering = !stap.gelijkMetSubId || Boolean(stap.wordtBepalendeFactor)
    const benaderd = benaderdOp[stap.subId]

    if (benaderd) {
      const dagenSindsBenaderd = dagenTussen(parseIsoLokaal(benaderd), vandaagDatum)
      if (dagenSindsBenaderd >= WACHT_OP_REACTIE_DREMPEL_DAGEN) {
        signalen.push({
          subId: stap.subId,
          themaId: stap.themaId,
          label: stap.label,
          type: 'wacht-op-reactie',
          tekst: `${stap.label}: al ${dagenSindsBenaderd} dagen geen reactie sinds benaderd.`,
          beinvloedtOplevering,
        })
        continue // duidelijkste signaal voor deze stap; niet ook nog "nadert" tonen
      }
    }

    const dagenTotStart = dagenTussen(vandaagDatum, parseIsoLokaal(stap.start))
    if (dagenTotStart <= NADERT_DREMPEL_DAGEN) {
      // dagenTussen telt kalenderdagen — bewust, want de gebruiker denkt in "over hoeveel dagen"
      // op de kalender, niet in werkdagen, als het over opvolgen/bellen gaat.
      const wanneer = dagenTotStart <= 0 ? 'start vandaag' : `start over ${dagenTotStart} dag(en)`
      signalen.push({
        subId: stap.subId,
        themaId: stap.themaId,
        label: stap.label,
        type: 'nadert-onbevestigd',
        tekst: `${stap.label} ${wanneer}, nog niet bevestigd.`,
        beinvloedtOplevering,
      })
    }
  }

  return signalen
}

export type VoortgangStatus = 'nog-niet-gestart' | 'bezig' | 'opgeleverd'

export interface Voortgang {
  percentage: number // 0-100
  status: VoortgangStatus
  /** themaId van de verst gevorderde stap die al gestart is; alleen relevant bij status 'bezig'. */
  huidigeThemaId?: string
}

/**
 * Voortgang als percentage van de tijd tussen de vroegste werkelijk geplande start en de
 * oplevering, plus de huidige fase. Gebaseerd op de werkelijke planning, niet op de (mogelijk
 * verouderde) vertrekdatumHuurder — dezelfde reden als bij de Gantt-tijdlijn: een vertrekdatum
 * ver in het verleden waarbij alles op vandaag geklemd is, zou anders een groot percentage
 * tonen terwijl er in werkelijkheid nog niets is gebeurd.
 */
export function bepaalVoortgang(planning: GeplandeSub[], vandaag: string): Voortgang {
  if (planning.length === 0) {
    return { percentage: 0, status: 'nog-niet-gestart' }
  }

  const vandaagDatum = parseIsoLokaal(vandaag)
  const vroegsteStart = parseIsoLokaal(
    planning.reduce((min, p) => (p.start < min ? p.start : min), planning[0].start),
  )
  const opleverIso = opleverdatum(planning)!
  const opgeleverd = parseIsoLokaal(opleverIso)

  if (vandaagDatum.getTime() < vroegsteStart.getTime()) {
    return { percentage: 0, status: 'nog-niet-gestart' }
  }
  if (vandaagDatum.getTime() > opgeleverd.getTime()) {
    return { percentage: 100, status: 'opgeleverd' }
  }

  const totaleDagen = dagenTussen(vroegsteStart, opgeleverd)
  const verstrekenDagen = dagenTussen(vroegsteStart, vandaagDatum)
  const percentage = totaleDagen > 0 ? Math.round((verstrekenDagen / totaleDagen) * 100) : 100

  let huidigeThemaId: string | undefined
  for (const stap of planning) {
    if (parseIsoLokaal(stap.start).getTime() <= vandaagDatum.getTime()) {
      huidigeThemaId = stap.themaId
    }
  }

  return { percentage, status: 'bezig', huidigeThemaId }
}
