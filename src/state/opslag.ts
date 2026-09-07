// De opslaglaag: browseropslag (localStorage) voor fase 4. Een echte backend kan dit later vervangen
// zonder dat domain/ of components/ het merken — dit bestand is de enige plek die localStorage kent.
import { BIBLIOTHEEK_SEED } from '../domain/bibliotheekSeed'
import type { Thema, Verbouwing } from '../domain/types'

// Versienummer in de sleutel: een toekomstige, incompatibele schemawijziging kan de versie ophogen
// in plaats van te breken op oude, opgeslagen data.
const BIBLIOTHEEK_KEY = 'verbouwmonitor.bibliotheek.v1'
const VERBOUWINGEN_KEY = 'verbouwmonitor.verbouwingen.v1'

function veiligLezen<T>(key: string, fallback: T): T {
  try {
    const ruw = localStorage.getItem(key)
    if (ruw === null) return fallback
    return JSON.parse(ruw) as T
  } catch (fout) {
    console.warn(`Kon "${key}" niet lezen uit de opslag, val terug op de standaardwaarde.`, fout)
    return fallback
  }
}

function veiligSchrijven<T>(key: string, waarde: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(waarde))
  } catch (fout) {
    console.warn(`Kon "${key}" niet opslaan.`, fout)
  }
}

/** De activiteiten-bibliotheek, apart bewaard van de woningen (zie CLAUDE.md). */
export function laadBibliotheek(): Thema[] {
  return veiligLezen(BIBLIOTHEEK_KEY, BIBLIOTHEEK_SEED)
}

export function bewaarBibliotheek(bibliotheek: Thema[]): void {
  veiligSchrijven(BIBLIOTHEEK_KEY, bibliotheek)
}

export function laadVerbouwingen(): Verbouwing[] {
  return veiligLezen(VERBOUWINGEN_KEY, [])
}

export function bewaarVerbouwingen(verbouwingen: Verbouwing[]): void {
  veiligSchrijven(VERBOUWINGEN_KEY, verbouwingen)
}
