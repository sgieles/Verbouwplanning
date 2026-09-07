import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { isoLokaal } from './domain/werkdagen'

beforeEach(() => {
  localStorage.clear()
})

describe('App — integratiepad fase 5', () => {
  it('een nieuwe verbouwing aanmaken levert meteen een doorgerekende planning op', () => {
    render(<App />)

    expect(screen.getByText('Nog geen verbouwingen aangemaakt.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Nieuwe verbouwing' }))

    fireEvent.change(screen.getByLabelText('Adres'), { target: { value: 'Lindelaan 14' } })
    fireEvent.change(screen.getByLabelText('Vertrekdatum huurder'), { target: { value: '2024-01-01' } })

    fireEvent.click(screen.getByRole('button', { name: /planning genereren/ }))

    // Landt op het planning-scherm met het adres als titel en minstens één doorgerekende stap.
    expect(screen.getByRole('heading', { name: 'Lindelaan 14' })).toBeInTheDocument()
    expect(screen.getByText('Verwachte oplevering').closest('div')).toBeInTheDocument()
    // Elke stap heeft een uitklapbare bewerk-actie (fase 6).
    expect(screen.getAllByRole('button', { name: /Bewerken/ }).length).toBeGreaterThan(0)

    // Terug naar het overzicht: de verbouwing staat er nu in met een berekende oplevering.
    fireEvent.click(screen.getByRole('button', { name: '← Terug' }))
    expect(within(screen.getByRole('table')).getByText('Lindelaan 14')).toBeInTheDocument()
    expect(screen.queryByText('Nog geen verbouwingen aangemaakt.')).not.toBeInTheDocument()
  })

  it('bewaart de verbouwing zodat hij na een "herlaad" (nieuwe render) nog bestaat', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '+ Nieuwe verbouwing' }))
    fireEvent.change(screen.getByLabelText('Adres'), { target: { value: 'Kerkstraat 3' } })
    fireEvent.click(screen.getByRole('button', { name: /planning genereren/ }))
    unmount()

    render(<App />)
    expect(within(screen.getByRole('table')).getByText('Kerkstraat 3')).toBeInTheDocument()
  })
})

function stapRij(label: string): HTMLElement {
  const strong = screen.getByText((content, el) => el?.tagName === 'STRONG' && content === label)
  // strong -> kleine labelwrapper -> header-rij (flex) -> buitenste stap-rij (bevat ook StapActies)
  return strong.closest('div')!.parentElement!.parentElement!
}

// De <option>-value is verbouwing.id (niet het adres); kies via de zichtbare optietekst.
function kiesWoning(adres: string) {
  const select = screen.getByLabelText('Woning') as HTMLSelectElement
  const waarde = within(select).getByText(adres).closest('option')!.getAttribute('value')!
  fireEvent.change(select, { target: { value: waarde } })
}

function maakVerbouwingAan(adres: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ Nieuwe verbouwing' }))
  fireEvent.change(screen.getByLabelText('Adres'), { target: { value: adres } })
  fireEvent.change(screen.getByLabelText('Vertrekdatum huurder'), { target: { value: '2024-01-01' } })
  fireEvent.click(screen.getByRole('button', { name: /planning genereren/ }))
}

describe('App — integratiepad fase 6 (Planning-scherm bedienen)', () => {
  it('een startdatum zetten (📌) verplaatst de stap en toont de markering', () => {
    render(<App />)
    maakVerbouwingAan('Lindelaan 14')

    const rij = stapRij('Inmeten')
    fireEvent.click(within(rij).getByRole('button', { name: /Bewerken/ }))
    fireEvent.change(within(rij).getByLabelText('Startdatum'), { target: { value: '2024-01-15' } })
    fireEvent.click(within(rij).getByRole('button', { name: 'Zet startdatum' }))

    expect(within(rij).getByText('📌')).toBeInTheDocument()
    expect(within(rij).getByText(/15 jan 2024/)).toBeInTheDocument()
  })

  it('twee subs koppelen ("start gelijk met") toont het label en kan weer losgemaakt worden', () => {
    render(<App />)
    maakVerbouwingAan('Lindelaan 14')

    const rij = stapRij('Inmeten')
    fireEvent.click(within(rij).getByRole('button', { name: /Bewerken/ }))
    fireEvent.change(within(rij).getByLabelText('Start gelijk met'), {
      target: { value: 'vloer-eruit' },
    })
    fireEvent.click(within(rij).getByRole('button', { name: 'Koppel' }))

    // Anker op "^gelijk met " om het statische veldlabel "Start gelijk met" niet mee te matchen.
    expect(within(rij).getByText(/^gelijk met /)).toBeInTheDocument()

    fireEvent.click(within(rij).getByRole('button', { name: 'Ontkoppel' }))
    expect(within(rij).queryByText(/^gelijk met /)).not.toBeInTheDocument()
  })

  it('accorderen zet de planning vast en de knop kan niet nogmaals geklikt worden', () => {
    render(<App />)
    maakVerbouwingAan('Lindelaan 14')

    expect(screen.queryByText('✓ vastgezet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Planning vastzetten' }))

    expect(screen.getByText('✓ vastgezet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Planning is vastgezet' })).toBeDisabled()
  })
})

describe('App — integratiepad fase 7 (Overzicht met wachttijd-bewaking)', () => {
  it('een net aangemaakte verbouwing (vertrekdatum in het verleden, dus geklemd op vandaag) toont een signaal in "Vandaag te doen"', () => {
    render(<App />)
    // maakVerbouwingAan gebruikt vertrekdatum 2024-01-01 — geklemd op vandaag, dus de eerste
    // stappen zijn per definitie onbevestigd én naderend.
    maakVerbouwingAan('Lindelaan 14')
    fireEvent.click(screen.getByRole('button', { name: '← Terug' }))

    expect(screen.getByText('Vandaag te doen')).toBeInTheDocument()
    expect(screen.getAllByText(/nog niet bevestigd/).length).toBeGreaterThan(0)
    // Statusmarkering in de tabel wijkt af van "op schema".
    expect(within(screen.getByRole('table')).getByText(/wacht op reactie/)).toBeInTheDocument()
  })

  it('een partij die te lang niet reageert (📞 benaderd, 6 dagen geleden) verschijnt als "wacht op reactie"', () => {
    render(<App />)
    maakVerbouwingAan('Lindelaan 14')

    const zesDagenGeleden = isoLokaal(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))
    const rij = stapRij('Inmeten')
    fireEvent.click(within(rij).getByRole('button', { name: /Bewerken/ }))
    fireEvent.change(within(rij).getByLabelText('Benaderd op'), { target: { value: zesDagenGeleden } })
    fireEvent.click(within(rij).getByRole('button', { name: 'Markeer benaderd' }))

    fireEvent.click(screen.getByRole('button', { name: '← Terug' }))
    expect(screen.getByText(/geen reactie/)).toBeInTheDocument()
  })

  it('toont "Overzicht" als titel en de lege-staat tekst zonder verbouwingen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Overzicht' })).toBeInTheDocument()
    expect(screen.getByText('Nog geen verbouwingen aangemaakt.')).toBeInTheDocument()
    expect(screen.queryByText('Vandaag te doen')).not.toBeInTheDocument()
  })
})

// Het label van een SubRij in Beheer staat direct (geen <strong>) in een div; closest('div') is
// dus een no-op op zichzelf. Twee parentElement-stappen omhoog geeft de buitenste rij-container,
// die zowel de knoppenrij als het (na "Bewerken") uitgeklapte paneel bevat.
function beheerSubRij(label: string): HTMLElement {
  return screen.getByText(label).closest('div')!.parentElement!.parentElement!
}

describe('App — integratiepad fase 8 (Beheer)', () => {
  it('een nieuwe subactiviteit toevoegen in Beheer verschijnt meteen bij Nieuwe verbouwing', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'beheer' }))

    const schilderThema = screen.getByText('Schilderen & stucen').closest('.kaart') as HTMLElement
    fireEvent.click(within(schilderThema).getByRole('button', { name: '+ subactiviteit' }))
    fireEvent.change(within(schilderThema).getByLabelText('Nieuwe subactiviteit label'), {
      target: { value: 'Kitwerk' },
    })
    fireEvent.click(within(schilderThema).getByRole('button', { name: 'Toevoegen' }))
    expect(within(schilderThema).getByText('Kitwerk')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'overzicht' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Nieuwe verbouwing' }))
    fireEvent.click(screen.getByRole('button', { name: /Schilderen & stucen/ })) // thema openklappen
    expect(screen.getByText('Kitwerk')).toBeInTheDocument()
  })

  it('een gearchiveerde subactiviteit is niet meer aan te vinken bij Nieuwe verbouwing', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'beheer' }))

    const uitvoerenRij = beheerSubRij('Schilderen & stucen uitvoeren')
    fireEvent.click(within(uitvoerenRij).getByRole('button', { name: 'Archiveer' }))
    expect(within(uitvoerenRij).getByText('gearchiveerd')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'overzicht' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Nieuwe verbouwing' }))
    fireEvent.click(screen.getByRole('button', { name: /Schilderen & stucen/ })) // thema openklappen
    expect(screen.queryByText('Schilderen & stucen uitvoeren')).not.toBeInTheDocument()
    // Het thema zelf heeft nog wel de andere sub, dus blijft zichtbaar.
    expect(screen.getByText('Opmeten & offerte')).toBeInTheDocument()
  })

  it('wijzigen van duur van een sub die in gebruik is, vraagt eerst bevestiging', () => {
    render(<App />)
    // Maak een verbouwing aan die "Inmeten" gebruikt.
    fireEvent.click(screen.getByRole('button', { name: '+ Nieuwe verbouwing' }))
    fireEvent.change(screen.getByLabelText('Adres'), { target: { value: 'Lindelaan 14' } })
    fireEvent.click(screen.getByRole('button', { name: /planning genereren/ }))
    fireEvent.click(screen.getByRole('button', { name: '← Terug' }))

    fireEvent.click(screen.getByRole('button', { name: 'beheer' }))
    const inmetenRij = beheerSubRij('Inmeten')
    fireEvent.click(within(inmetenRij).getByRole('button', { name: 'Bewerken' }))
    fireEvent.change(within(inmetenRij).getByLabelText('Duur'), { target: { value: '3' } })
    fireEvent.click(within(inmetenRij).getByRole('button', { name: 'Opslaan' }))

    expect(within(inmetenRij).getByText(/lopende verbouwing/)).toBeInTheDocument()
    fireEvent.click(within(inmetenRij).getByRole('button', { name: 'Ja, bibliotheek aanpassen' }))
    expect(within(inmetenRij).getByText(/3d/)).toBeInTheDocument()
  })
})

describe('App — integratiepad fase 9 (Mail verwerken)', () => {
  it('een geplakte mail leidt tot een goed te keuren voorstel dat na goedkeuring een 🔒-anker zet', () => {
    render(<App />)
    maakVerbouwingAan('Lindelaan 14')
    fireEvent.click(screen.getByRole('button', { name: '← Terug' }))

    fireEvent.click(screen.getByRole('button', { name: 'mail verwerken' }))
    kiesWoning('Lindelaan 14')
    fireEvent.change(screen.getByLabelText('Mailtekst'), {
      target: { value: 'Beste, we kunnen Inmeten inplannen op 15 maart 2024. Met vriendelijke groet.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analyseer' }))

    expect(screen.getByLabelText('Activiteit')).toHaveValue('keuken-inmeten')
    expect(screen.getByLabelText('Toegezegde datum')).toHaveValue('2024-03-15')

    fireEvent.click(screen.getByRole('button', { name: 'Goedkeuren' }))
    expect(screen.getByText('✓ Voorstel goedgekeurd en verwerkt in de planning')).toBeInTheDocument()

    // Controleer in Planning dat Inmeten nu een 🔒-anker heeft op de toegezegde datum.
    fireEvent.click(screen.getByRole('button', { name: 'overzicht' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bekijk planning' }))
    const inmetenRij = stapRij('Inmeten')
    expect(within(inmetenRij).getByText('🔒')).toBeInTheDocument()
    expect(within(inmetenRij).getByText(/15 mrt 2024|15 maart 2024/)).toBeInTheDocument()
  })

  it('negeren laat de planning ongemoeid', () => {
    render(<App />)
    maakVerbouwingAan('Lindelaan 14')
    fireEvent.click(screen.getByRole('button', { name: '← Terug' }))

    fireEvent.click(screen.getByRole('button', { name: 'mail verwerken' }))
    kiesWoning('Lindelaan 14')
    fireEvent.change(screen.getByLabelText('Mailtekst'), { target: { value: 'Inmeten kan op 15 maart 2024.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyseer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Negeren' }))

    expect(screen.queryByLabelText('Activiteit')).not.toBeInTheDocument()
    expect(screen.queryByText('✓ Voorstel goedgekeurd en verwerkt in de planning')).not.toBeInTheDocument()
  })
})
