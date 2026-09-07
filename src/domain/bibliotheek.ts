// Pure, framework-onafhankelijke mutaties op de activiteiten-bibliotheek (fase 8: Beheer).
// Net als verbouwing.ts: geen enkele functie muteert in-place, alles geeft een nieuwe
// bibliotheek terug (state/ bewaart het resultaat).
import type { Groep, Sub, Thema, Verbouwing } from './types'

function genereerId(bestaand: Set<string>, basis: string): string {
  const slug =
    basis
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[̀-ͯ]', 'g'), '') // diakrieten (é, ë, …) weg na NFD-normalisatie
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'

  if (!bestaand.has(slug)) return slug
  let poging = 2
  while (bestaand.has(`${slug}-${poging}`)) poging += 1
  return `${slug}-${poging}`
}

function alleSubIds(bibliotheek: Thema[]): Set<string> {
  return new Set(bibliotheek.flatMap((thema) => thema.subs.map((sub) => sub.id)))
}

function alleThemaIds(bibliotheek: Thema[]): Set<string> {
  return new Set(bibliotheek.map((thema) => thema.id))
}

export function voegThemaToe(
  bibliotheek: Thema[],
  input: { label: string; groep: Groep; volgorde: number },
): Thema[] {
  const nieuwThema: Thema = { id: genereerId(alleThemaIds(bibliotheek), input.label), ...input, subs: [] }
  return [...bibliotheek, nieuwThema]
}

export function wijzigThema(
  bibliotheek: Thema[],
  themaId: string,
  wijzigingen: Partial<Pick<Thema, 'label' | 'groep' | 'volgorde'>>,
): Thema[] {
  return bibliotheek.map((thema) => (thema.id === themaId ? { ...thema, ...wijzigingen } : thema))
}

export function archiveerThema(bibliotheek: Thema[], themaId: string): Thema[] {
  return wijzigThemaVlag(bibliotheek, themaId, true)
}

export function heractiveerThema(bibliotheek: Thema[], themaId: string): Thema[] {
  return wijzigThemaVlag(bibliotheek, themaId, false)
}

function wijzigThemaVlag(bibliotheek: Thema[], themaId: string, gearchiveerd: boolean): Thema[] {
  return bibliotheek.map((thema) => (thema.id === themaId ? { ...thema, gearchiveerd } : thema))
}

/** Verwijdert een hoofdthema (met al zijn subs) hard. Alleen bedoeld voor thema's die nergens in gebruik zijn. */
export function verwijderThema(bibliotheek: Thema[], themaId: string): Thema[] {
  return bibliotheek.filter((thema) => thema.id !== themaId)
}

export function voegSubToe(
  bibliotheek: Thema[],
  themaId: string,
  input: { label: string; duur: number; wachttijd: number; kosten: number },
): Thema[] {
  const nieuweSub: Sub = { id: genereerId(alleSubIds(bibliotheek), input.label), ...input }
  return bibliotheek.map((thema) =>
    thema.id === themaId ? { ...thema, subs: [...thema.subs, nieuweSub] } : thema,
  )
}

export function wijzigSub(
  bibliotheek: Thema[],
  subId: string,
  wijzigingen: Partial<Pick<Sub, 'label' | 'duur' | 'wachttijd' | 'kosten'>>,
): Thema[] {
  return bibliotheek.map((thema) => ({
    ...thema,
    subs: thema.subs.map((sub) => (sub.id === subId ? { ...sub, ...wijzigingen } : sub)),
  }))
}

export function archiveerSub(bibliotheek: Thema[], subId: string): Thema[] {
  return wijzigSubVlag(bibliotheek, subId, true)
}

export function heractiveerSub(bibliotheek: Thema[], subId: string): Thema[] {
  return wijzigSubVlag(bibliotheek, subId, false)
}

function wijzigSubVlag(bibliotheek: Thema[], subId: string, gearchiveerd: boolean): Thema[] {
  return bibliotheek.map((thema) => ({
    ...thema,
    subs: thema.subs.map((sub) => (sub.id === subId ? { ...sub, gearchiveerd } : sub)),
  }))
}

/** Verwijdert een subactiviteit hard. Alleen bedoeld voor subs die nergens in gebruik zijn. */
export function verwijderSub(bibliotheek: Thema[], subId: string): Thema[] {
  return bibliotheek.map((thema) => ({ ...thema, subs: thema.subs.filter((sub) => sub.id !== subId) }))
}

/** De bibliotheek zoals die bij een NIEUWE verbouwing te kiezen is: gearchiveerde thema's en subs eruit gefilterd. */
export function beschikbareThemas(bibliotheek: Thema[]): Thema[] {
  return bibliotheek
    .filter((thema) => !thema.gearchiveerd)
    .map((thema) => ({ ...thema, subs: thema.subs.filter((sub) => !sub.gearchiveerd) }))
}

/** Is deze subactiviteit gekozen in minstens één bestaande verbouwing? Bepaalt of bewerken een waarschuwing verdient. */
export function subIsInGebruik(subId: string, verbouwingen: Verbouwing[]): boolean {
  return verbouwingen.some((v) => v.geselecteerdeSubIds.includes(subId))
}

/** Is minstens één sub van dit thema gekozen in een bestaande verbouwing? */
export function themaIsInGebruik(thema: Thema, verbouwingen: Verbouwing[]): boolean {
  return thema.subs.some((sub) => subIsInGebruik(sub.id, verbouwingen))
}
