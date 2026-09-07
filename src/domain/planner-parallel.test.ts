import { describe, expect, it } from 'vitest'
import { PlanningCyclusFout, berekenPlanning, subIdsInKetenVolgorde } from './planner'
import type { Thema } from './types'

// Vaste kalender-ankers: 2024-01-01 is een maandag.
// ma 1, di 2, wo 3, do 4, vr 5, za 6, zo 7.

function bibliotheekMetInmeetDuur(duur: number): Thema[] {
  return [
    {
      id: 'verwijderen',
      label: 'Vloer / keuken verwijderen',
      groep: 'Voorbereiding',
      volgorde: 10,
      subs: [{ id: 'vloer-eruit', label: 'Vloer eruit', duur: 1, wachttijd: 0, kosten: 0 }],
    },
    {
      id: 'keuken',
      label: 'Keuken vervangen',
      groep: 'Voorbereiding',
      volgorde: 20,
      subs: [
        { id: 'inmeten', label: 'Inmeten', duur, wachttijd: 0, kosten: 0 },
        { id: 'bestellen', label: 'Bestellen', duur: 1, wachttijd: 1, kosten: 0 },
      ],
    },
  ]
}

describe('berekenPlanning — Laag 3 (canoniek testgeval: inmeten start gelijk met vloer eruit)', () => {
  it('variant A — inmeten duurt 1 dag: bestellen sluit kort aan na inmeten (niet na vloer eruit)', () => {
    const bibliotheek = bibliotheekMetInmeetDuur(1)
    const planning = berekenPlanning({
      bibliotheek,
      geselecteerdeSubIds: ['vloer-eruit', 'inmeten', 'bestellen'],
      vertrekdatumHuurder: '2024-01-01',
      ankers: {},
      parallelKoppelingen: { inmeten: 'vloer-eruit' },
      vandaag: '2024-01-01',
    })

    const vloerEruit = planning.find((p) => p.subId === 'vloer-eruit')!
    const inmeten = planning.find((p) => p.subId === 'inmeten')!
    const bestellen = planning.find((p) => p.subId === 'bestellen')!

    // Beide starten op dezelfde dag.
    expect(vloerEruit.start).toBe('2024-01-01')
    expect(inmeten.start).toBe('2024-01-01')
    expect(inmeten.gelijkMetSubId).toBe('vloer-eruit')
    expect(inmeten.eind).toBe('2024-01-01')

    // bestellen wacht op inmeten (niet op vloer-eruit) en sluit kort aan.
    expect(bestellen.start).toBe('2024-01-02')
  })

  it('variant B — inmeten duurt 3 dagen: bestellen wacht tot inmeten écht klaar is, ook al was vloer eruit eerder klaar', () => {
    const bibliotheek = bibliotheekMetInmeetDuur(3)
    const planning = berekenPlanning({
      bibliotheek,
      geselecteerdeSubIds: ['vloer-eruit', 'inmeten', 'bestellen'],
      vertrekdatumHuurder: '2024-01-01',
      ankers: {},
      parallelKoppelingen: { inmeten: 'vloer-eruit' },
      vandaag: '2024-01-01',
    })

    const vloerEruit = planning.find((p) => p.subId === 'vloer-eruit')!
    const inmeten = planning.find((p) => p.subId === 'inmeten')!
    const bestellen = planning.find((p) => p.subId === 'bestellen')!

    expect(vloerEruit.eind).toBe('2024-01-01') // vloer-eruit is al op dag 1 klaar
    expect(inmeten.start).toBe('2024-01-01')
    expect(inmeten.eind).toBe('2024-01-03') // ma+2 werkdagen = wo 3 jan
    expect(bestellen.start).toBe('2024-01-04') // wacht op inmeten's werkelijke einde, niet op vloer-eruit
  })
})

describe('berekenPlanning — Laag 3 samenspel met Laag 2', () => {
  it('een anker op de gekoppelde stap wint van de koppeling', () => {
    const bibliotheek = bibliotheekMetInmeetDuur(1)
    const planning = berekenPlanning({
      bibliotheek,
      geselecteerdeSubIds: ['vloer-eruit', 'inmeten', 'bestellen'],
      vertrekdatumHuurder: '2024-01-01',
      ankers: { inmeten: { bron: 'bevestigd', datum: '2024-01-10' } },
      parallelKoppelingen: { inmeten: 'vloer-eruit' },
      vandaag: '2024-01-01',
    })

    const inmeten = planning.find((p) => p.subId === 'inmeten')!
    expect(inmeten.start).toBe('2024-01-10')
    expect(inmeten.ankerBron).toBe('bevestigd')
  })

  it('een koppeling naar een niet-geselecteerde sub wordt genegeerd (valt terug op de keten)', () => {
    const bibliotheek = bibliotheekMetInmeetDuur(1)
    const planning = berekenPlanning({
      bibliotheek,
      geselecteerdeSubIds: ['inmeten', 'bestellen'], // vloer-eruit niet geselecteerd
      vertrekdatumHuurder: '2024-01-01',
      ankers: {},
      parallelKoppelingen: { inmeten: 'vloer-eruit' },
      vandaag: '2024-01-01',
    })

    const inmeten = planning.find((p) => p.subId === 'inmeten')!
    expect(inmeten.gelijkMetSubId).toBeUndefined()
    expect(inmeten.start).toBe('2024-01-01') // eerste in de keten, normale Laag 1-berekening
  })
})

describe('wordtBepalendeFactor — signalering (CLAUDE.md: gekoppelde stap wordt zelf bepalend)', () => {
  it('staat niet aan wanneer de gekoppelde stap even lang of korter duurt dan zijn koppel-stap', () => {
    const planning = berekenPlanning({
      bibliotheek: bibliotheekMetInmeetDuur(1),
      geselecteerdeSubIds: ['vloer-eruit', 'inmeten', 'bestellen'],
      vertrekdatumHuurder: '2024-01-01',
      ankers: {},
      parallelKoppelingen: { inmeten: 'vloer-eruit' },
      vandaag: '2024-01-01',
    })
    expect(planning.find((p) => p.subId === 'inmeten')!.wordtBepalendeFactor).toBe(false)
  })

  it('staat aan wanneer de gekoppelde stap langer duurt dan zijn koppel-stap', () => {
    const planning = berekenPlanning({
      bibliotheek: bibliotheekMetInmeetDuur(3),
      geselecteerdeSubIds: ['vloer-eruit', 'inmeten', 'bestellen'],
      vertrekdatumHuurder: '2024-01-01',
      ankers: {},
      parallelKoppelingen: { inmeten: 'vloer-eruit' },
      vandaag: '2024-01-01',
    })
    expect(planning.find((p) => p.subId === 'inmeten')!.wordtBepalendeFactor).toBe(true)
  })

  it('staat uit zodra een anker de koppeling overstemt', () => {
    const planning = berekenPlanning({
      bibliotheek: bibliotheekMetInmeetDuur(3),
      geselecteerdeSubIds: ['vloer-eruit', 'inmeten', 'bestellen'],
      vertrekdatumHuurder: '2024-01-01',
      ankers: { inmeten: { bron: 'handmatig', datum: '2024-01-02' } },
      parallelKoppelingen: { inmeten: 'vloer-eruit' },
      vandaag: '2024-01-01',
    })
    expect(planning.find((p) => p.subId === 'inmeten')!.wordtBepalendeFactor).toBe(false)
  })
})

describe('subIdsInKetenVolgorde', () => {
  it('geeft geselecteerde subs terug in ketenvolgorde (thema.volgorde, dan positie in het thema)', () => {
    const bibliotheek = bibliotheekMetInmeetDuur(1)
    expect(subIdsInKetenVolgorde(bibliotheek, ['bestellen', 'vloer-eruit', 'inmeten'])).toEqual([
      'vloer-eruit',
      'inmeten',
      'bestellen',
    ])
  })

  it('laat niet-geselecteerde subs weg', () => {
    const bibliotheek = bibliotheekMetInmeetDuur(1)
    expect(subIdsInKetenVolgorde(bibliotheek, ['bestellen', 'inmeten'])).toEqual(['inmeten', 'bestellen'])
  })
})

describe('berekenPlanning — Laag 3 cyclusdetectie', () => {
  it('geeft een nette fout bij een cyclus tussen twee koppelingen', () => {
    const bibliotheek: Thema[] = [
      {
        id: 'thema',
        label: 'Thema',
        groep: 'Afwerking',
        volgorde: 10,
        subs: [
          { id: 'a', label: 'A', duur: 1, wachttijd: 0, kosten: 0 },
          { id: 'b', label: 'B', duur: 1, wachttijd: 0, kosten: 0 },
        ],
      },
    ]

    expect(() =>
      berekenPlanning({
        bibliotheek,
        geselecteerdeSubIds: ['a', 'b'],
        vertrekdatumHuurder: '2024-01-01',
        ankers: {},
        parallelKoppelingen: { a: 'b', b: 'a' },
        vandaag: '2024-01-01',
      }),
    ).toThrow(PlanningCyclusFout)
  })
})
