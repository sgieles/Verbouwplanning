// Navigatie-shell rond de vijf schermen uit CLAUDE.md: Overzicht, Nieuwe verbouwing, Planning,
// Mail verwerken en Beheer. Alle fasen (0 t/m 9) uit BUILDPLAN.md staan; fase 10 (leren uit
// historie) is een "later"-punt en zit hier nog niet in.
import { useState } from 'react'
import { Beheer } from './components/Beheer'
import { MailVerwerken } from './components/MailVerwerken'
import { NieuweVerbouwing } from './components/NieuweVerbouwing'
import { Overzicht } from './components/Overzicht'
import { Planning } from './components/Planning'
import { maakNieuweVerbouwing } from './domain/verbouwing'
import { AppStateProvider, useAppState } from './state/AppStateContext'

type Weergave =
  | { scherm: 'overzicht' }
  | { scherm: 'nieuw' }
  | { scherm: 'planning'; verbouwingId: string }
  | { scherm: 'mail' }
  | { scherm: 'beheer' }

type NavScherm = 'overzicht' | 'mail' | 'beheer'
const NAV_SCHERMEN: NavScherm[] = ['overzicht', 'mail', 'beheer']
const NAV_LABEL: Record<NavScherm, string> = { overzicht: 'overzicht', mail: 'mail verwerken', beheer: 'beheer' }

function Nav({ actief, onKies }: { actief: NavScherm | null; onKies: (scherm: NavScherm) => void }) {
  return (
    <nav style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
      {NAV_SCHERMEN.map((scherm) => (
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
          {NAV_LABEL[scherm]}
        </button>
      ))}
    </nav>
  )
}

function AppInhoud() {
  const { bibliotheek, verbouwingen, voegVerbouwingToe, werkVerbouwingBij, werkBibliotheekBij } = useAppState()
  const [weergave, setWeergave] = useState<Weergave>({ scherm: 'overzicht' })

  const navActief: NavScherm | null =
    weergave.scherm === 'beheer' || weergave.scherm === 'mail' || weergave.scherm === 'overzicht'
      ? weergave.scherm
      : null

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
  } else if (weergave.scherm === 'mail') {
    inhoud = <MailVerwerken bibliotheek={bibliotheek} verbouwingen={verbouwingen} onWerkBij={werkVerbouwingBij} />
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
