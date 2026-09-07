// Pure, framework-onafhankelijke mutaties op een Verbouwing en de bibliotheek.
// Deze functies muteren niets in-place; ze geven een nieuw object terug (state/ bewaart het resultaat).
import type { Anker, SubOverride, Thema, Verbouwing } from './types'

function genereerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback voor omgevingen zonder crypto.randomUUID (bijv. geen secure context).
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function maakNieuweVerbouwing(
  adres: string,
  vertrekdatumHuurder: string,
  geselecteerdeSubIds: string[],
): Verbouwing {
  return {
    id: genereerId(),
    adres,
    vertrekdatumHuurder,
    geselecteerdeSubIds,
    ankers: {},
    parallelKoppelingen: {},
    overrides: {},
  }
}

export function zetAnker(verbouwing: Verbouwing, subId: string, anker: Anker): Verbouwing {
  return { ...verbouwing, ankers: { ...verbouwing.ankers, [subId]: anker } }
}

export function verwijderAnker(verbouwing: Verbouwing, subId: string): Verbouwing {
  const { [subId]: _verwijderd, ...rest } = verbouwing.ankers
  return { ...verbouwing, ankers: rest }
}

/** Zet "start gelijk met" voor een sub. Weigert een directe zelfkoppeling (A gelijk met A). */
export function zetKoppeling(verbouwing: Verbouwing, subId: string, gelijkMetSubId: string): Verbouwing {
  if (subId === gelijkMetSubId) {
    throw new Error(`Een subactiviteit kan niet gelijk starten met zichzelf ("${subId}").`)
  }
  return {
    ...verbouwing,
    parallelKoppelingen: { ...verbouwing.parallelKoppelingen, [subId]: gelijkMetSubId },
  }
}

export function verwijderKoppeling(verbouwing: Verbouwing, subId: string): Verbouwing {
  const { [subId]: _verwijderd, ...rest } = verbouwing.parallelKoppelingen
  return { ...verbouwing, parallelKoppelingen: rest }
}

export function zetOverride(verbouwing: Verbouwing, subId: string, override: SubOverride): Verbouwing {
  return {
    ...verbouwing,
    overrides: { ...verbouwing.overrides, [subId]: { ...verbouwing.overrides[subId], ...override } },
  }
}

export function verwijderOverride(verbouwing: Verbouwing, subId: string): Verbouwing {
  const { [subId]: _verwijderd, ...rest } = verbouwing.overrides
  return { ...verbouwing, overrides: rest }
}

/**
 * Past de per-verbouwing overrides toe op de bibliotheek en geeft een nieuwe, "effectieve"
 * bibliotheek terug die je in berekenPlanning kunt gebruiken. De bibliotheek zelf blijft ongemoeid —
 * dit raakt alléén de kopie voor deze ene verbouwing (zie CLAUDE.md: bibliotheek en woningen apart).
 */
export function effectieveBibliotheek(bibliotheek: Thema[], overrides: Record<string, SubOverride>): Thema[] {
  if (Object.keys(overrides).length === 0) return bibliotheek

  return bibliotheek.map((thema) => {
    const heeftOverride = thema.subs.some((sub) => overrides[sub.id])
    if (!heeftOverride) return thema
    return {
      ...thema,
      subs: thema.subs.map((sub) => {
        const override = overrides[sub.id]
        return override ? { ...sub, ...override } : sub
      }),
    }
  })
}
