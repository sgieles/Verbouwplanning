import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

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

    // Terug naar de lijst: de verbouwing staat er nu in met een berekende oplevering.
    fireEvent.click(screen.getByRole('button', { name: '← Terug' }))
    expect(screen.getByText('Lindelaan 14')).toBeInTheDocument()
    expect(screen.queryByText('Nog geen verbouwingen aangemaakt.')).not.toBeInTheDocument()
  })

  it('bewaart de verbouwing zodat hij na een "herlaad" (nieuwe render) nog bestaat', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '+ Nieuwe verbouwing' }))
    fireEvent.change(screen.getByLabelText('Adres'), { target: { value: 'Kerkstraat 3' } })
    fireEvent.click(screen.getByRole('button', { name: /planning genereren/ }))
    unmount()

    render(<App />)
    expect(screen.getByText('Kerkstraat 3')).toBeInTheDocument()
  })
})

function stapRij(label: string): HTMLElement {
  const strong = screen.getByText((content, el) => el?.tagName === 'STRONG' && content === label)
  // strong -> kleine labelwrapper -> header-rij (flex) -> buitenste stap-rij (bevat ook StapActies)
  return strong.closest('div')!.parentElement!.parentElement!
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
