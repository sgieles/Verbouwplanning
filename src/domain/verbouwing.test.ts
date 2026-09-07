import { describe, expect, it } from 'vitest'
import { berekenPlanning } from './planner'
import {
  effectieveBibliotheek,
  maakNieuweVerbouwing,
  verwijderAnker,
  verwijderKoppeling,
  verwijderOverride,
  zetAnker,
  zetKoppeling,
  zetOverride,
} from './verbouwing'
import type { Thema } from './types'

const BIBLIOTHEEK: Thema[] = [
  {
    id: 'schilderen',
    label: 'Schilderen & stucen',
    groep: 'Afwerking',
    volgorde: 10,
    subs: [{ id: 'schilderen-uitvoeren', label: 'Schilderen', duur: 14, wachttijd: 0, kosten: 4500 }],
  },
]

describe('maakNieuweVerbouwing', () => {
  it('geeft een lege, valide verbouwing met een uniek id', () => {
    const a = maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', ['schilderen-uitvoeren'])
    const b = maakNieuweVerbouwing('Lindelaan 16', '2024-01-01', ['schilderen-uitvoeren'])

    expect(a.id).not.toBe(b.id)
    expect(a.adres).toBe('Lindelaan 14')
    expect(a.geselecteerdeSubIds).toEqual(['schilderen-uitvoeren'])
    expect(a.ankers).toEqual({})
    expect(a.parallelKoppelingen).toEqual({})
    expect(a.overrides).toEqual({})
  })
})

describe('ankers zetten en verwijderen', () => {
  it('zetAnker voegt toe zonder de rest van de verbouwing te muteren, verwijderAnker haalt weg', () => {
    const origineel = maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', ['schilderen-uitvoeren'])
    const metAnker = zetAnker(origineel, 'schilderen-uitvoeren', { bron: 'bevestigd', datum: '2024-01-10' })

    expect(origineel.ankers).toEqual({}) // origineel blijft ongewijzigd (immutable update)
    expect(metAnker.ankers['schilderen-uitvoeren']).toEqual({ bron: 'bevestigd', datum: '2024-01-10' })

    const zonderAnker = verwijderAnker(metAnker, 'schilderen-uitvoeren')
    expect(zonderAnker.ankers).toEqual({})
  })
})

describe('koppelingen zetten en verwijderen', () => {
  it('zetKoppeling en verwijderKoppeling werken immutable', () => {
    const v = maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', ['a', 'b'])
    const gekoppeld = zetKoppeling(v, 'b', 'a')
    expect(gekoppeld.parallelKoppelingen).toEqual({ b: 'a' })
    expect(verwijderKoppeling(gekoppeld, 'b').parallelKoppelingen).toEqual({})
  })

  it('weigert een sub aan zichzelf te koppelen', () => {
    const v = maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', ['a'])
    expect(() => zetKoppeling(v, 'a', 'a')).toThrow()
  })
})

describe('overrides zetten, verwijderen en toepassen', () => {
  it('zetOverride slaat alleen de gegeven velden op en merget met bestaande overrides', () => {
    const v = maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', ['schilderen-uitvoeren'])
    const metDuur = zetOverride(v, 'schilderen-uitvoeren', { duur: 10 })
    const metDuurEnKosten = zetOverride(metDuur, 'schilderen-uitvoeren', { kosten: 5000 })

    expect(metDuurEnKosten.overrides['schilderen-uitvoeren']).toEqual({ duur: 10, kosten: 5000 })
    expect(verwijderOverride(metDuurEnKosten, 'schilderen-uitvoeren').overrides).toEqual({})
  })

  it('effectieveBibliotheek past overrides toe zonder de oorspronkelijke bibliotheek te wijzigen', () => {
    const overrides = { 'schilderen-uitvoeren': { duur: 10 } }
    const effectief = effectieveBibliotheek(BIBLIOTHEEK, overrides)

    expect(BIBLIOTHEEK[0].subs[0].duur).toBe(14) // ongewijzigd
    expect(effectief[0].subs[0].duur).toBe(10)
    expect(effectief[0].subs[0].wachttijd).toBe(0) // niet-overridden velden blijven staan
  })

  it('een override werkt door in de planning', () => {
    const v = zetOverride(
      maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', ['schilderen-uitvoeren']),
      'schilderen-uitvoeren',
      { duur: 3 },
    )
    const planning = berekenPlanning({
      bibliotheek: effectieveBibliotheek(BIBLIOTHEEK, v.overrides),
      geselecteerdeSubIds: v.geselecteerdeSubIds,
      vertrekdatumHuurder: v.vertrekdatumHuurder,
      ankers: v.ankers,
      parallelKoppelingen: v.parallelKoppelingen,
      vandaag: '2024-01-01',
    })

    // maandag 1 jan + 2 werkdagen (duur 3 - 1) = woensdag 3 jan, niet de bibliotheek-duur van 14
    expect(planning[0].eind).toBe('2024-01-03')
  })
})
