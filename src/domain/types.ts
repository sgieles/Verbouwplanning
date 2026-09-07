// Datamodel — zie CLAUDE.md voor de volledige domeincontext.

export type Groep = 'Voorbereiding' | 'Afwerking' | 'Oplevering'

export interface Sub {
  id: string
  label: string
  duur: number // werkdagen dat de activiteit zelf duurt
  wachttijd: number // werkdagen tussen einde vorige stap en start van deze
  kosten: number // hele euro's; 0 toegestaan
  // Gearchiveerd = niet meer aanvinkbaar bij een nieuwe verbouwing, maar bestaande woningen
  // die hem al gebruiken blijven intact (zie CLAUDE.md, fase 8: archiveren i.p.v. verwijderen).
  gearchiveerd?: boolean
}

export interface Thema {
  id: string
  label: string
  groep: Groep
  volgorde: number // stappen van 10, ruimte om tussen te schuiven
  subs: Sub[]
  gearchiveerd?: boolean
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
  /** True als deze gekoppelde stap langer duurt dan zijn koppel-stap en zo zelf bepalend wordt voor zijn opvolger. */
  wordtBepalendeFactor?: boolean
  kosten: number
}

/** Per-verbouwing aanpassing van een bibliotheek-waarde (bijv. deze schilder rekent meer dagen).
 *  Verandert alleen déze verbouwing — de bibliotheek zelf blijft ongemoeid. */
export interface SubOverride {
  duur?: number
  wachttijd?: number
  kosten?: number
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
  // aangepaste duur/wachttijd/kosten per sub, alleen voor deze verbouwing
  overrides: Record<string, SubOverride>
  // false = concept (net aangemaakt/nog in bewerking); true = geaccordeerd, de actieve planning van de woning
  geaccordeerd: boolean
  // datum waarop een partij benaderd is voor deze sub (isoLokaal) — voor wachttijd-bewaking (fase 7).
  // Onafhankelijk van ankers: je kunt benaderd hebben zonder dat er al een toegezegde datum is.
  benaderdOp: Record<string, string>
}
