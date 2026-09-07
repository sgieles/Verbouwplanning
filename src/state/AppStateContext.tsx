// Deelt de bibliotheek en verbouwingen met alle schermen, en houdt localStorage in sync.
// Eén plek die state/opslag.ts aanroept — de componenten kennen alleen deze context, niet de opslag zelf.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Verbouwing } from '../domain/types'
import { bewaarVerbouwingen, laadBibliotheek, laadVerbouwingen } from './opslag'

interface AppState {
  bibliotheek: ReturnType<typeof laadBibliotheek>
  verbouwingen: Verbouwing[]
  voegVerbouwingToe: (verbouwing: Verbouwing) => void
  werkVerbouwingBij: (id: string, updater: (verbouwing: Verbouwing) => Verbouwing) => void
}

const AppStateContext = createContext<AppState | undefined>(undefined)

export function AppStateProvider({ children }: { children: ReactNode }) {
  // Bibliotheek wordt in fase 8 (Beheer) bewerkbaar; voor nu eenmalig geladen en read-only.
  const [bibliotheek] = useState(() => laadBibliotheek())
  const [verbouwingen, setVerbouwingen] = useState<Verbouwing[]>(() => laadVerbouwingen())

  const waarde = useMemo<AppState>(
    () => ({
      bibliotheek,
      verbouwingen,
      voegVerbouwingToe: (verbouwing) => {
        setVerbouwingen((vorige) => {
          const nieuw = [...vorige, verbouwing]
          bewaarVerbouwingen(nieuw)
          return nieuw
        })
      },
      werkVerbouwingBij: (id, updater) => {
        setVerbouwingen((vorige) => {
          const nieuw = vorige.map((v) => (v.id === id ? updater(v) : v))
          bewaarVerbouwingen(nieuw)
          return nieuw
        })
      },
    }),
    [bibliotheek, verbouwingen],
  )

  return <AppStateContext.Provider value={waarde}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState moet binnen een AppStateProvider gebruikt worden.')
  }
  return context
}
