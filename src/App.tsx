// Tijdelijke navigatie-shell: een echt scherm-framework met de vijf schermen uit CLAUDE.md
// (Overzicht, Nieuwe verbouwing, Planning, Mail verwerken, Beheer) volgt in de latere fasen.
import { useState } from 'react'
import { NieuweVerbouwing } from './components/NieuweVerbouwing'
import { Planning } from './components/Planning'
import { VerbouwingenLijst } from './components/VerbouwingenLijst'
import { maakNieuweVerbouwing } from './domain/verbouwing'
import { AppStateProvider, useAppState } from './state/AppStateContext'

type Weergave = { scherm: 'lijst' } | { scherm: 'nieuw' } | { scherm: 'planning'; verbouwingId: string }

function AppInhoud() {
  const { bibliotheek, verbouwingen, voegVerbouwingToe, werkVerbouwingBij } = useAppState()
  const [weergave, setWeergave] = useState<Weergave>({ scherm: 'lijst' })

  if (weergave.scherm === 'nieuw') {
    return (
      <NieuweVerbouwing
        bibliotheek={bibliotheek}
        onAanmaken={(adres, vertrekdatum, subIds) => {
          const verbouwing = maakNieuweVerbouwing(adres, vertrekdatum, subIds)
          voegVerbouwingToe(verbouwing)
          setWeergave({ scherm: 'planning', verbouwingId: verbouwing.id })
        }}
      />
    )
  }

  if (weergave.scherm === 'planning') {
    const verbouwing = verbouwingen.find((v) => v.id === weergave.verbouwingId)
    if (!verbouwing) {
      setWeergave({ scherm: 'lijst' })
      return null
    }
    return (
      <Planning
        verbouwing={verbouwing}
        bibliotheek={bibliotheek}
        onTerug={() => setWeergave({ scherm: 'lijst' })}
        onWerkBij={(updater) => werkVerbouwingBij(verbouwing.id, updater)}
      />
    )
  }

  return (
    <VerbouwingenLijst
      verbouwingen={verbouwingen}
      bibliotheek={bibliotheek}
      onNieuw={() => setWeergave({ scherm: 'nieuw' })}
      onBekijk={(id) => setWeergave({ scherm: 'planning', verbouwingId: id })}
    />
  )
}

function App() {
  return (
    <main style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 20 }}>Verbouwmonitor</h1>
      <AppStateProvider>
        <AppInhoud />
      </AppStateProvider>
    </main>
  )
}

export default App
