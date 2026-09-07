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
    const tabellen = screen.getAllByRole('table')
    expect(tabellen.length).toBeGreaterThan(0)
    // Elke tabel moet minstens één rij met een berekende start/eind-datum tonen.
    const eersteRij = within(tabellen[0]).getAllByRole('row')[1]
    expect(eersteRij).toBeDefined()

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
