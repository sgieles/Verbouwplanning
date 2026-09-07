// Tijdelijke navigatie-shell: een echt scherm-framework met de vijf schermen uit CLAUDE.md
// (Overzicht, Nieuwe verbouwing, Planning, Mail verwerken, Beheer) volgt in de latere fasen.
// Mail verwerken (fase 9) staat nog niet in de navigatie.
import { useState } from 'react'
import { Beheer } from './components/Beheer'
import { NieuweVerbouwing } from './components/NieuweVerbouwing'
import { Overzicht } from './components/Overzicht'
import { Planning } from './components/Planning'
import { maakNieuweVerbouwing } from './domain/verbouwing'
import { AppStateProvider, useAppState } from './state/AppStateContext'

type Weergave =
  | { scherm: 'overzicht' }
  | { scherm: 'nieuw' }
  | { scherm: 'planning'; verbouwingId: string }
  | { scherm: 'beheer' }

function Nav({ actief, onKies }: { actief: 'overzicht' | 'beheer' | null; onKies: (scherm: 'overzicht' | 'beheer') => void }) {
  return (
    <nav style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
      {(['overzicht', 'beheer'] as const).map((scherm) => (
        <button
          key={scherm}
          type="button"
          onClick={() => onKies(scherm)}
          style={{
            font: 'inherit',
            fontWeight: 600,
            padding: '6px 12px',
            border: 'none',
            borderBottom: actief === scherm ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none',
            color: actief === scherm ? 'var(--heading)' : 'var(--text-muted)',
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {scherm}
        </button>
      ))}
    </nav>
  )
}

function AppInhoud() {
  const { bibliotheek, verbouwingen, voegVerbouwingToe, werkVerbouwingBij, werkBibliotheekBij } = useAppState()
  const [weergave, setWeergave] = useState<Weergave>({ scherm: 'overzicht' })

  const navActief = weergave.scherm === 'beheer' ? 'beheer' : weergave.scherm === 'overzicht' ? 'overzicht' : null

  let inhoud: React.ReactNode
  if (weergave.scherm === 'nieuw') {
    inhoud = (
      <NieuweVerbouwing
        bibliotheek={bibliotheek}
        onAanmaken={(adres, vertrekdatum, subIds) => {
          const verbouwing = maakNieuweVerbouwing(adres, vertrekdatum, subIds)
          voegVerbouwingToe(verbouwing)
          setWeergave({ scherm: 'planning', verbouwingId: verbouwing.id })
        }}
      />
    )
  } else if (weergave.scherm === 'planning') {
    const verbouwing = verbouwingen.find((v) => v.id === weergave.verbouwingId)
    if (!verbouwing) {
      setWeergave({ scherm: 'overzicht' })
      inhoud = null
    } else {
      inhoud = (
        <Planning
          verbouwing={verbouwing}
          bibliotheek={bibliotheek}
          onTerug={() => setWeergave({ scherm: 'overzicht' })}
          onWerkBij={(updater) => werkVerbouwingBij(verbouwing.id, updater)}
        />
      )
    }
  } else if (weergave.scherm === 'beheer') {
    inhoud = <Beheer bibliotheek={bibliotheek} verbouwingen={verbouwingen} onWerkBij={werkBibliotheekBij} />
  } else {
    inhoud = (
      <Overzicht
        verbouwingen={verbouwingen}
        bibliotheek={bibliotheek}
        onNieuw={() => setWeergave({ scherm: 'nieuw' })}
        onBekijk={(id) => setWeergave({ scherm: 'planning', verbouwingId: id })}
      />
    )
  }

  return (
    <>
      <Nav actief={navActief} onKies={(scherm) => setWeergave({ scherm })} />
      {inhoud}
    </>
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
