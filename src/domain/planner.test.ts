import { describe, expect, it } from 'vitest'
import { berekenPlanning, opleverdatum, totaleKosten } from './planner'
import type { Thema } from './types'

// Vaste kalender-ankers: 2024-01-01 is een maandag.
// ma 1, di 2, wo 3, do 4, vr 5, za 6, zo 7, ma 8, di 9, wo 10, do 11.

const BIBLIOTHEEK: Thema[] = [
  {
    id: 'schilderen',
    label: 'Schilderen & stucen',
    groep: 'Afwerking',
    volgorde: 10,
    subs: [{ id: 'schilderen-uitvoeren', label: 'Schilderen', duur: 2, wachttijd: 0, kosten: 100 }],
  },
  {
    id: 'vloer',
    label: 'Vloer leggen',
    groep: 'Afwerking',
    volgorde: 20,
    subs: [{ id: 'vloer-leggen', label: 'Vloer leggen', duur: 1, wachttijd: 1, kosten: 200 }],
  },
  {
    id: 'schoonmaak',
    label: 'Schoonmaak',
    groep: 'Oplevering',
    volgorde: 30,
    subs: [{ id: 'schoonmaak', label: 'Schoonmaak', duur: 1, wachttijd: 1, kosten: 50 }],
  },
]

const ALLE_SUB_IDS = BIBLIOTHEEK.flatMap((t) => t.subs.map((s) => s.id))

describe('berekenPlanning — Laag 1 (basisvolgorde)', () => {
  it('rekent de keten netjes door: volgende stap start na einde vorige + eigen wachttijd', () => {
    const planning = berekenPlanning({
      bibliotheek: BIBLIOTHEEK,
      geselecteerdeSubIds: ALLE_SUB_IDS,
      vertrekdatumHuurder: '2024-01-01', // maandag
      ankers: {},
      vandaag: '2024-01-01',
    })

    expect(planning).toEqual([
      expect.objectContaining({ subId: 'schilderen-uitvoeren', start: '2024-01-01', eind: '2024-01-02' }),
      // vloer-leggen: wachttijd 1 werkdag na einde schilderen (2 jan) = 3 jan
      expect.objectContaining({ subId: 'vloer-leggen', start: '2024-01-03', eind: '2024-01-03' }),
      // schoonmaak: wachttijd 1 werkdag na einde vloer (3 jan) = 4 jan
      expect.objectContaining({ subId: 'schoonmaak', start: '2024-01-04', eind: '2024-01-04' }),
    ])
    expect(opleverdatum(planning)).toBe('2024-01-04')
    expect(totaleKosten(planning)).toBe(350)
  })

  it('lege selectie geeft een lege planning', () => {
    const planning = berekenPlanning({
      bibliotheek: BIBLIOTHEEK,
      geselecteerdeSubIds: [],
      vertrekdatumHuurder: '2024-01-01',
      ankers: {},
      vandaag: '2024-01-01',
    })
    expect(planning).toEqual([])
    expect(opleverdatum(planning)).toBeUndefined()
  })
})

describe('berekenPlanning — Laag 2 (verankering)', () => {
  it('een hard anker later dan het voorstel laat de keten erachter meeschuiven', () => {
    const planning = berekenPlanning({
      bibliotheek: BIBLIOTHEEK,
      geselecteerdeSubIds: ALLE_SUB_IDS,
      vertrekdatumHuurder: '2024-01-01',
      ankers: { 'vloer-leggen': { bron: 'bevestigd', datum: '2024-01-10' } },
      vandaag: '2024-01-01',
    })

    const vloer = planning.find((p) => p.subId === 'vloer-leggen')!
    const schoonmaak = planning.find((p) => p.subId === 'schoonmaak')!

    expect(vloer.start).toBe('2024-01-10')
    expect(vloer.vast).toBe(true)
    expect(vloer.ankerBron).toBe('bevestigd')
    // schoonmaak schuift mee: wachttijd 1 werkdag na 10 jan (wo) = 11 jan (do)
    expect(schoonmaak.start).toBe('2024-01-11')
    expect(opleverdatum(planning)).toBe('2024-01-11')
  })

  it('een anker vóór het automatische voorstel verankert exact op die datum', () => {
    const planning = berekenPlanning({
      bibliotheek: BIBLIOTHEEK,
      geselecteerdeSubIds: ALLE_SUB_IDS,
      vertrekdatumHuurder: '2024-01-08', // maandag week later
      ankers: { 'schilderen-uitvoeren': { bron: 'handmatig', datum: '2024-01-09' } },
      vandaag: '2024-01-08',
    })

    const schilderen = planning.find((p) => p.subId === 'schilderen-uitvoeren')!
    expect(schilderen.start).toBe('2024-01-09')
    expect(schilderen.ankerBron).toBe('handmatig')
  })

  it('een verleden-anker (✓) wordt gehonoreerd en niet aangeraakt', () => {
    const planning = berekenPlanning({
      bibliotheek: BIBLIOTHEEK,
      geselecteerdeSubIds: ALLE_SUB_IDS,
      vertrekdatumHuurder: '2024-01-01',
      ankers: { 'schilderen-uitvoeren': { bron: 'verleden', datum: '2023-12-04' } },
      vandaag: '2024-01-01',
    })

    const schilderen = planning.find((p) => p.subId === 'schilderen-uitvoeren')!
    expect(schilderen.start).toBe('2023-12-04')
    expect(schilderen.vast).toBe(true)
    expect(schilderen.ankerBron).toBe('verleden')
  })
})

describe('berekenPlanning — randgevallen', () => {
  it('klemt een niet-verankerde stap die anders in het verleden zou vallen op de eerstvolgende werkdag', () => {
    const planning = berekenPlanning({
      bibliotheek: BIBLIOTHEEK,
      geselecteerdeSubIds: ['schilderen-uitvoeren'],
      vertrekdatumHuurder: '2023-12-01', // ver in het "verleden" t.o.v. vandaag
      ankers: {},
      vandaag: '2024-01-06', // zaterdag
    })

    const schilderen = planning[0]
    // eerstvolgende werkdag na zaterdag 6 jan is maandag 8 jan
    expect(schilderen.start).toBe('2024-01-08')
    expect(schilderen.vast).toBe(false)
    expect(schilderen.ankerBron).toBeUndefined()
  })

  it('een stap die precies op vandaag valt, geldt nog niet als verleden', () => {
    const bibliotheekZonderWachttijd: Thema[] = [
      {
        id: 'schoonmaak',
        label: 'Schoonmaak',
        groep: 'Oplevering',
        volgorde: 10,
        subs: [{ id: 'schoonmaak', label: 'Schoonmaak', duur: 1, wachttijd: 0, kosten: 0 }],
      },
    ]
    const planning = berekenPlanning({
      bibliotheek: bibliotheekZonderWachttijd,
      geselecteerdeSubIds: ['schoonmaak'],
      vertrekdatumHuurder: '2024-01-03', // woensdag
      ankers: {},
      vandaag: '2024-01-03',
    })

    const schoonmaak = planning[0]
    expect(schoonmaak.start).toBe('2024-01-03')
    expect(schoonmaak.eind).toBe('2024-01-03')
    expect(schoonmaak.vast).toBe(false)
    expect(schoonmaak.ankerBron).toBeUndefined()
  })
})
