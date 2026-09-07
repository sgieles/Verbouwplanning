// Deelt de bibliotheek en verbouwingen met alle schermen, en houdt localStorage in sync.
// Eén plek die state/opslag.ts aanroept — de componenten kennen alleen deze context, niet de opslag zelf.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Thema, Verbouwing } from '../domain/types'
import { bewaarBibliotheek, bewaarVerbouwingen, laadBibliotheek, laadVerbouwingen } from './opslag'

interface AppState {
  bibliotheek: Thema[]
  verbouwingen: Verbouwing[]
  voegVerbouwingToe: (verbouwing: Verbouwing) => void
  werkVerbouwingBij: (id: string, updater: (verbouwing: Verbouwing) => Verbouwing) => void
  werkBibliotheekBij: (updater: (bibliotheek: Thema[]) => Thema[]) => void
}

const AppStateContext = createContext<AppState | undefined>(undefined)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [bibliotheek, setBibliotheek] = useState<Thema[]>(() => laadBibliotheek())
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
      werkBibliotheekBij: (updater) => {
        setBibliotheek((vorige) => {
          const nieuw = updater(vorige)
          bewaarBibliotheek(nieuw)
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
