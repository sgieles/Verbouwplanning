// Datamodel — zie CLAUDE.md voor de volledige domeincontext.

export type Groep = 'Voorbereiding' | 'Afwerking' | 'Oplevering'

export interface Sub {
  id: string
  label: string
  duur: number // werkdagen dat de activiteit zelf duurt
  wachttijd: number // werkdagen tussen einde vorige stap en start van deze
  kosten: number // hele euro's; 0 toegestaan
}

export interface Thema {
  id: string
  label: string
  groep: Groep
  volgorde: number // stappen van 10, ruimte om tussen te schuiven
  subs: Sub[]
}

export type AnkerBron = 'handmatig' | 'bevestigd' | 'verleden'

export interface Anker {
  bron: AnkerBron
  datum: string // isoLokaal: YYYY-MM-DD
}

/** Een subactiviteit is per verbouwing te koppelen aan een andere: "start gelijk met". Zie CLAUDE.md Laag 3. */
export interface ParallelKoppelingen {
  [subId: string]: string // subId -> subId waarvan de startdatum wordt overgenomen
}

export interface GeplandeSub {
  subId: string
  themaId: string
  label: string
  start: string // isoLokaal
  eind: string // isoLokaal
  vast: boolean
  ankerBron?: AnkerBron
  gelijkMetSubId?: string // gezet wanneer deze stap via Laag 3 gekoppeld is
  kosten: number
}

export interface Verbouwing {
  id: string
  adres: string
  vertrekdatumHuurder: string // isoLokaal — start van de keten
  geselecteerdeSubIds: string[]
  // handmatige (📌) en bevestigde (🔒) ankers per sub; 'verleden' (✓) wordt afgeleid, niet opgeslagen
  ankers: Record<string, Anker>
  // "start gelijk met" per verbouwing (Laag 3) — geen bibliotheek-eigenschap
  parallelKoppelingen: ParallelKoppelingen
}
