import { describe, expect, it } from 'vitest'
import { bepaalSignalen, bepaalVoortgang, NADERT_DREMPEL_DAGEN, WACHT_OP_REACTIE_DREMPEL_DAGEN } from './signalering'
import type { GeplandeSub } from './types'

function stap(overrides: Partial<GeplandeSub> & Pick<GeplandeSub, 'subId' | 'start' | 'eind'>): GeplandeSub {
  return {
    themaId: 't1',
    label: overrides.subId,
    vast: false,
    kosten: 0,
    ...overrides,
  }
}

describe('bepaalSignalen — nadert-onbevestigd', () => {
  it('signaleert een onbevestigde stap die binnen de drempel start', () => {
    const planning = [stap({ subId: 'a', start: '2024-01-12', eind: '2024-01-12' })]
    const signalen = bepaalSignalen(planning, {}, '2024-01-10')
    expect(signalen).toEqual([
      expect.objectContaining({ subId: 'a', type: 'nadert-onbevestigd', beinvloedtOplevering: true }),
    ])
    expect(signalen[0].tekst).toContain('start over 2 dag')
  })

  it('signaleert niet als de start ruim buiten de drempel ligt', () => {
    const planning = [stap({ subId: 'b', start: '2024-01-20', eind: '2024-01-20' })]
    expect(bepaalSignalen(planning, {}, '2024-01-10')).toEqual([])
  })

  it('gebruikt "start vandaag" als de stap precies vandaag begint', () => {
    const planning = [stap({ subId: 'e', start: '2024-01-10', eind: '2024-01-10' })]
    const signalen = bepaalSignalen(planning, {}, '2024-01-10')
    expect(signalen[0].tekst).toContain('start vandaag')
  })

  it('signaleert niet voor verstreken (✓) of al bevestigde (🔒) stappen', () => {
    const planning = [
      stap({ subId: 'verleden', start: '2024-01-01', eind: '2024-01-01', ankerBron: 'verleden', vast: true }),
      stap({ subId: 'bevestigd', start: '2024-01-11', eind: '2024-01-11', ankerBron: 'bevestigd', vast: true }),
    ]
    expect(bepaalSignalen(planning, {}, '2024-01-10')).toEqual([])
  })

  it('drempelwaarde exact op de grens telt nog mee', () => {
    const grensDatum = '2024-01-15' // 5 dagen na vandaag, gelijk aan NADERT_DREMPEL_DAGEN
    expect(NADERT_DREMPEL_DAGEN).toBe(5)
    const planning = [stap({ subId: 'grens', start: grensDatum, eind: grensDatum })]
    expect(bepaalSignalen(planning, {}, '2024-01-10')).toHaveLength(1)
  })
})

describe('bepaalSignalen — wacht-op-reactie', () => {
  it('signaleert wanneer benaderd maar te lang geen reactie, ongeacht hoe ver de start weg ligt', () => {
    const planning = [stap({ subId: 'f', start: '2024-02-01', eind: '2024-02-01' })]
    const signalen = bepaalSignalen(planning, { f: '2024-01-04' }, '2024-01-10') // 6 dagen geleden
    expect(signalen).toEqual([expect.objectContaining({ subId: 'f', type: 'wacht-op-reactie' })])
    expect(signalen[0].tekst).toContain('6 dagen geen reactie')
  })

  it('toont geen signaal als de wachttijd nog binnen de drempel valt en de start niet nadert', () => {
    expect(WACHT_OP_REACTIE_DREMPEL_DAGEN).toBe(5)
    const planning = [stap({ subId: 'g', start: '2024-02-01', eind: '2024-02-01' })]
    const signalen = bepaalSignalen(planning, { g: '2024-01-07' }, '2024-01-10') // pas 3 dagen geleden
    expect(signalen).toEqual([])
  })

  it('geeft per stap maximaal één signaal (wacht-op-reactie wint van nadert-onbevestigd)', () => {
    const planning = [stap({ subId: 'h', start: '2024-01-11', eind: '2024-01-11' })] // nadert ook (1 dag)
    const signalen = bepaalSignalen(planning, { h: '2024-01-01' }, '2024-01-10') // 9 dagen geleden
    expect(signalen).toHaveLength(1)
    expect(signalen[0].type).toBe('wacht-op-reactie')
  })
})

describe('bepaalSignalen — beinvloedtOplevering', () => {
  it('is false voor een gekoppelde stap die zelf niet bepalend is', () => {
    const planning = [
      stap({ subId: 'i', start: '2024-01-11', eind: '2024-01-11', gelijkMetSubId: 'x', wordtBepalendeFactor: false }),
    ]
    expect(bepaalSignalen(planning, {}, '2024-01-10')[0].beinvloedtOplevering).toBe(false)
  })

  it('is true voor een gekoppelde stap die wél zelf bepalend is geworden', () => {
    const planning = [
      stap({ subId: 'j', start: '2024-01-11', eind: '2024-01-11', gelijkMetSubId: 'x', wordtBepalendeFactor: true }),
    ]
    expect(bepaalSignalen(planning, {}, '2024-01-10')[0].beinvloedtOplevering).toBe(true)
  })
})

describe('bepaalVoortgang', () => {
  const planning = [
    stap({ subId: 's1', themaId: 't1', start: '2024-01-01', eind: '2024-01-05' }),
    stap({ subId: 's2', themaId: 't2', start: '2024-01-08', eind: '2024-01-15' }),
  ]

  it('lege planning: nog niet gestart, 0%', () => {
    expect(bepaalVoortgang([], '2024-01-01')).toEqual({ percentage: 0, status: 'nog-niet-gestart' })
  })

  it('vandaag vóór de vroegste geplande start: nog niet gestart', () => {
    expect(bepaalVoortgang(planning, '2023-12-31')).toEqual({
      percentage: 0,
      status: 'nog-niet-gestart',
    })
  })

  it('vandaag halverwege: bezig, met de laatst-gestarte stap als huidige fase', () => {
    const voortgang = bepaalVoortgang(planning, '2024-01-08')
    expect(voortgang.status).toBe('bezig')
    expect(voortgang.percentage).toBe(50) // 7 van de 14 dagen
    expect(voortgang.huidigeThemaId).toBe('t2')
  })

  it('vandaag ná de oplevering: opgeleverd, 100%', () => {
    expect(bepaalVoortgang(planning, '2024-01-16')).toEqual({
      percentage: 100,
      status: 'opgeleverd',
    })
  })

  it('vandaag precies op de opleverdatum: 100%, status nog "bezig"', () => {
    const voortgang = bepaalVoortgang(planning, '2024-01-15')
    expect(voortgang.percentage).toBe(100)
    expect(voortgang.status).toBe('bezig')
  })

  it('een verouderde vertrekdatum die alles op vandaag klemt, geeft geen misleidend hoog percentage', () => {
    // Zelfde soort valkuil als bij de Gantt: de voortgang moet uitgaan van de werkelijke
    // planning, niet van een vertrekdatumHuurder die (na een klem-naar-vandaag) ver in het
    // verleden ligt terwijl er in werkelijkheid nog niets is gebeurd.
    const geklemdePlanning = [
      stap({ subId: 'a', themaId: 't1', start: '2024-01-10', eind: '2024-01-10' }),
      stap({ subId: 'b', themaId: 't2', start: '2024-01-24', eind: '2024-01-24' }), // oplevering
    ]
    const voortgang = bepaalVoortgang(geklemdePlanning, '2024-01-10') // vandaag == vroegste start
    expect(voortgang.percentage).toBe(0)
    expect(voortgang.status).toBe('bezig')
  })
})
