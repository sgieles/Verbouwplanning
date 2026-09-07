import { describe, expect, it } from 'vitest'
import { analyseerMail, herkenBedrag, herkenDatum, herkenSub } from './mailAnalyse'

const SUBS = [
  { id: 'schilderen-uitvoeren', label: 'Schilderen & stucen uitvoeren' },
  { id: 'schilderen-opmeten', label: 'Opmeten & offerte' },
  { id: 'vloer-leggen', label: 'Vloer leggen' },
]

describe('herkenSub', () => {
  it('herkent de activiteit waarnaar de mail verwijst', () => {
    const tekst = 'Beste, we kunnen starten met Schilderen & stucen uitvoeren op 15 maart. Groet, Jan'
    expect(herkenSub(tekst, SUBS)?.id).toBe('schilderen-uitvoeren')
  })

  it('geeft undefined als geen enkele activiteit in de tekst voorkomt', () => {
    expect(herkenSub('Bedankt voor uw bericht, we nemen contact op.', SUBS)).toBeUndefined()
  })

  it('kiest bij meerdere matches de langste (meest specifieke) labelmatch', () => {
    const subsMetOverlap = [
      { id: 'kort', label: 'Vloer' },
      { id: 'lang', label: 'Vloer leggen' },
    ]
    const tekst = 'We kunnen de Vloer leggen vanaf volgende week.'
    expect(herkenSub(tekst, subsMetOverlap)?.id).toBe('lang')
  })

  it('is niet hoofdlettergevoelig', () => {
    expect(herkenSub('we gaan VLOER LEGGEN volgende maand', SUBS)?.id).toBe('vloer-leggen')
  })
})

describe('herkenDatum', () => {
  it('herkent DD-MM-JJJJ', () => {
    expect(herkenDatum('we kunnen starten op 15-03-2024')).toBe('2024-03-15')
  })

  it('herkent DD/MM/JJJJ', () => {
    expect(herkenDatum('levering voorzien op 15/03/2024')).toBe('2024-03-15')
  })

  it('herkent JJJJ-MM-DD', () => {
    expect(herkenDatum('vanaf 2024-03-15 kunnen we beginnen')).toBe('2024-03-15')
  })

  it('herkent "15 maart 2024"', () => {
    expect(herkenDatum('we starten op 15 maart 2024')).toBe('2024-03-15')
  })

  it('herkent "15 maart" zonder jaartal en vult het jaar van vandaag aan', () => {
    expect(herkenDatum('we starten op 15 maart', '2024-01-10')).toBe('2024-03-15')
  })

  it('schuift het jaar op als de datum zonder jaartal anders >3 maanden in het verleden zou vallen', () => {
    // "we starten in januari", geschreven op 1 november 2024 -> bedoeld is januari 2025.
    expect(herkenDatum('we starten op 15 januari', '2024-11-01')).toBe('2025-01-15')
  })

  it('verwerpt een ongeldige datum (31 februari bestaat niet) in plaats van door te rollen', () => {
    expect(herkenDatum('gepland op 31 februari 2024')).toBeUndefined()
  })

  it('geeft undefined als er geen datum in de tekst staat', () => {
    expect(herkenDatum('we nemen snel contact op')).toBeUndefined()
  })

  it('numerieke DD-MM-JJJJ heeft voorrang boven een maandnaam-datum verderop in de tekst', () => {
    const tekst = 'Voorlopig 15-03-2024, definitief bevestigen we rond 20 maart 2024.'
    expect(herkenDatum(tekst)).toBe('2024-03-15')
  })
})

describe('herkenBedrag', () => {
  it('herkent "€1.500"', () => {
    expect(herkenBedrag('de meerprijs is €1.500')).toBe(1500)
  })

  it('herkent "€ 1.234,56" en rondt af op hele euro’s', () => {
    expect(herkenBedrag('kosten: € 1.234,56')).toBe(1235)
  })

  it('herkent "1500 euro"', () => {
    expect(herkenBedrag('dat is 1500 euro inclusief btw')).toBe(1500)
  })

  it('geeft undefined als er geen bedrag in de tekst staat', () => {
    expect(herkenBedrag('geen bedrag in dit bericht')).toBeUndefined()
  })
})

describe('analyseerMail', () => {
  it('combineert sub, datum en bedrag uit een realistische mail', () => {
    const mail = `
      Beste,

      Bedankt voor uw geduld. We kunnen Schilderen & stucen uitvoeren inplannen
      vanaf 15 maart 2024. De meerprijs voor het extra stucwerk komt op €350.

      Met vriendelijke groet,
      De Schilder
    `
    const resultaat = analyseerMail(mail, SUBS)
    expect(resultaat).toEqual({
      subId: 'schilderen-uitvoeren',
      subLabel: 'Schilderen & stucen uitvoeren',
      datum: '2024-03-15',
      bedrag: 350,
    })
  })

  it('laat velden weg die niet herkend worden', () => {
    const resultaat = analyseerMail('Bedankt voor uw bericht.', SUBS)
    expect(resultaat).toEqual({ subId: undefined, subLabel: undefined, datum: undefined, bedrag: undefined })
  })
})
