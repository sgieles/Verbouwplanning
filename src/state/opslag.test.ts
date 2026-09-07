import { beforeEach, describe, expect, it } from 'vitest'
import { BIBLIOTHEEK_SEED } from '../domain/bibliotheekSeed'
import { zetAnker, zetKoppeling, maakNieuweVerbouwing } from '../domain/verbouwing'
import { bewaarBibliotheek, bewaarVerbouwingen, laadBibliotheek, laadVerbouwingen } from './opslag'

beforeEach(() => {
  localStorage.clear()
})

describe('bibliotheek', () => {
  it('valt terug op de seed-data als er nog niets is opgeslagen', () => {
    expect(laadBibliotheek()).toEqual(BIBLIOTHEEK_SEED)
  })

  it('bewaart en laadt een aangepaste bibliotheek terug (round-trip)', () => {
    const aangepast = [{ ...BIBLIOTHEEK_SEED[0], label: 'Aangepast label' }]
    bewaarBibliotheek(aangepast)
    expect(laadBibliotheek()).toEqual(aangepast)
  })

  it('valt terug op de seed-data bij corrupte JSON in de opslag, in plaats van te crashen', () => {
    localStorage.setItem('verbouwmonitor.bibliotheek.v1', '{niet-geldige-json')
    expect(laadBibliotheek()).toEqual(BIBLIOTHEEK_SEED)
  })
})

describe('verbouwingen', () => {
  it('geeft een lege lijst als er nog geen verbouwingen zijn opgeslagen', () => {
    expect(laadVerbouwingen()).toEqual([])
  })

  it('Definitie van klaar (fase 4): aanmaken, anker + koppeling zetten, "herladen", alles staat er nog', () => {
    let verbouwing = maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', [
      'vloer-eruit',
      'keuken-inmeten',
      'keuken-bestellen',
    ])
    verbouwing = zetAnker(verbouwing, 'keuken-inmeten', { bron: 'bevestigd', datum: '2024-01-10' })
    verbouwing = zetKoppeling(verbouwing, 'keuken-inmeten', 'vloer-eruit')

    bewaarVerbouwingen([verbouwing])

    // Simuleer een herlaadde app: geen in-memory state meer, alleen wat er in de opslag staat.
    const naHerladen = laadVerbouwingen()

    expect(naHerladen).toEqual([verbouwing])
    expect(naHerladen[0].ankers['keuken-inmeten']).toEqual({ bron: 'bevestigd', datum: '2024-01-10' })
    expect(naHerladen[0].parallelKoppelingen['keuken-inmeten']).toBe('vloer-eruit')
  })
})
