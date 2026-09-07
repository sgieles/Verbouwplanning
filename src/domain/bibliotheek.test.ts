import { describe, expect, it } from 'vitest'
import {
  archiveerSub,
  archiveerThema,
  beschikbareThemas,
  heractiveerSub,
  heractiveerThema,
  subIsInGebruik,
  themaIsInGebruik,
  verwijderSub,
  verwijderThema,
  voegSubToe,
  voegThemaToe,
  wijzigSub,
  wijzigThema,
} from './bibliotheek'
import { maakNieuweVerbouwing } from './verbouwing'
import type { Thema } from './types'

const BIBLIOTHEEK: Thema[] = [
  {
    id: 'schilderen',
    label: 'Schilderen & stucen',
    groep: 'Afwerking',
    volgorde: 10,
    subs: [{ id: 'schilderen-uitvoeren', label: 'Schilderen', duur: 14, wachttijd: 3, kosten: 4500 }],
  },
]

describe('voegThemaToe / wijzigThema', () => {
  it('voegt een thema toe met een leesbaar, uniek id en lege subs', () => {
    const na = voegThemaToe(BIBLIOTHEEK, { label: 'Tuin aanleggen', groep: 'Oplevering', volgorde: 80 })
    const nieuw = na.find((t) => t.label === 'Tuin aanleggen')!
    expect(nieuw.id).toBe('tuin-aanleggen')
    expect(nieuw.subs).toEqual([])
    expect(BIBLIOTHEEK).toHaveLength(1) // origineel ongewijzigd
  })

  it('maakt een uniek id als de slug al bestaat', () => {
    const eenmaal = voegThemaToe(BIBLIOTHEEK, { label: 'Schilderen & stucen', groep: 'Afwerking', volgorde: 15 })
    const nieuw = eenmaal.find((t) => t.volgorde === 15)!
    expect(nieuw.id).toBe('schilderen-stucen') // ander id dan 'schilderen' (bestaand)
  })

  it('verwijdert diakrieten en rare tekens uit het gegenereerde id', () => {
    const na = voegThemaToe(BIBLIOTHEEK, { label: 'Café-terras / balkon!', groep: 'Oplevering', volgorde: 90 })
    expect(na.find((t) => t.label.startsWith('Café'))!.id).toBe('cafe-terras-balkon')
  })

  it('wijzigThema past alleen het gegeven thema aan', () => {
    const na = wijzigThema(BIBLIOTHEEK, 'schilderen', { volgorde: 25 })
    expect(na[0].volgorde).toBe(25)
    expect(na[0].label).toBe('Schilderen & stucen') // ongewijzigd
  })
})

describe('voegSubToe / wijzigSub', () => {
  it('voegt een sub toe aan het juiste thema met handmatige duur/wachttijd/kosten', () => {
    const na = voegSubToe(BIBLIOTHEEK, 'schilderen', { label: 'Kitwerk', duur: 1, wachttijd: 0, kosten: 150 })
    const thema = na.find((t) => t.id === 'schilderen')!
    expect(thema.subs).toHaveLength(2)
    expect(thema.subs[1]).toEqual({ id: 'kitwerk', label: 'Kitwerk', duur: 1, wachttijd: 0, kosten: 150 })
  })

  it('wijzigSub past alleen de gegeven sub aan, ongeacht in welk thema', () => {
    const na = wijzigSub(BIBLIOTHEEK, 'schilderen-uitvoeren', { duur: 10 })
    expect(na[0].subs[0].duur).toBe(10)
    expect(na[0].subs[0].wachttijd).toBe(3) // ongewijzigd
    expect(BIBLIOTHEEK[0].subs[0].duur).toBe(14) // origineel ongewijzigd
  })
})

describe('archiveren en heractiveren', () => {
  it('archiveerThema/heractiveerThema zetten alleen de vlag, subs blijven intact', () => {
    const gearchiveerd = archiveerThema(BIBLIOTHEEK, 'schilderen')
    expect(gearchiveerd[0].gearchiveerd).toBe(true)
    expect(gearchiveerd[0].subs).toEqual(BIBLIOTHEEK[0].subs)
    expect(heractiveerThema(gearchiveerd, 'schilderen')[0].gearchiveerd).toBe(false)
  })

  it('archiveerSub/heractiveerSub zetten de vlag op de sub, niet op het thema', () => {
    const gearchiveerd = archiveerSub(BIBLIOTHEEK, 'schilderen-uitvoeren')
    expect(gearchiveerd[0].gearchiveerd).toBeUndefined()
    expect(gearchiveerd[0].subs[0].gearchiveerd).toBe(true)
    expect(heractiveerSub(gearchiveerd, 'schilderen-uitvoeren')[0].subs[0].gearchiveerd).toBe(false)
  })
})

describe('beschikbareThemas', () => {
  it('filtert gearchiveerde thema’s en gearchiveerde subs uit losse thema’s eruit', () => {
    const bibliotheek: Thema[] = [
      { id: 'a', label: 'A', groep: 'Voorbereiding', volgorde: 10, gearchiveerd: true, subs: [{ id: 'a1', label: 'A1', duur: 1, wachttijd: 0, kosten: 0 }] },
      {
        id: 'b',
        label: 'B',
        groep: 'Afwerking',
        volgorde: 20,
        subs: [
          { id: 'b1', label: 'B1', duur: 1, wachttijd: 0, kosten: 0 },
          { id: 'b2', label: 'B2', duur: 1, wachttijd: 0, kosten: 0, gearchiveerd: true },
        ],
      },
    ]
    const beschikbaar = beschikbareThemas(bibliotheek)
    expect(beschikbaar.map((t) => t.id)).toEqual(['b'])
    expect(beschikbaar[0].subs.map((s) => s.id)).toEqual(['b1'])
    // origineel blijft intact (archiveren verwijdert nooit data)
    expect(bibliotheek).toHaveLength(2)
    expect(bibliotheek[1].subs).toHaveLength(2)
  })
})

describe('verwijderThema / verwijderSub (hard, alleen voor ongebruikte items)', () => {
  it('verwijdert het thema respectievelijk de sub volledig', () => {
    expect(verwijderThema(BIBLIOTHEEK, 'schilderen')).toEqual([])
    expect(verwijderSub(BIBLIOTHEEK, 'schilderen-uitvoeren')[0].subs).toEqual([])
  })
})

describe('subIsInGebruik / themaIsInGebruik', () => {
  it('detecteert gebruik in bestaande verbouwingen', () => {
    const verbouwing = maakNieuweVerbouwing('Lindelaan 14', '2024-01-01', ['schilderen-uitvoeren'])
    expect(subIsInGebruik('schilderen-uitvoeren', [verbouwing])).toBe(true)
    expect(subIsInGebruik('onbekend', [verbouwing])).toBe(false)
    expect(themaIsInGebruik(BIBLIOTHEEK[0], [verbouwing])).toBe(true)
  })

  it('geeft false als er geen verbouwingen zijn', () => {
    expect(subIsInGebruik('schilderen-uitvoeren', [])).toBe(false)
    expect(themaIsInGebruik(BIBLIOTHEEK[0], [])).toBe(false)
  })
})
