import { describe, expect, it } from 'vitest'
import {
  dagenTussen,
  eerstvolgendeWerkdag,
  formatteerDatumLeesbaar,
  isoLokaal,
  parseIsoLokaal,
  voegWerkdagenToe,
} from './werkdagen'

// Vaste kalender-ankers, onafhankelijk van "vandaag": 2024-01-01 is een maandag.
const MAANDAG = new Date(2024, 0, 1)
const WOENSDAG = new Date(2024, 0, 3)
const VRIJDAG = new Date(2024, 0, 5)
const ZATERDAG = new Date(2024, 0, 6)
const ZONDAG = new Date(2024, 0, 7)

describe('isoLokaal', () => {
  it('formatteert zonder tijdzoneverschuiving (geen toISOString-bug)', () => {
    expect(isoLokaal(new Date(2024, 0, 1))).toBe('2024-01-01')
    expect(isoLokaal(new Date(2024, 11, 31))).toBe('2024-12-31')
  })

  it('rondt correct terug via parseIsoLokaal, ook over een jaargrens', () => {
    expect(isoLokaal(parseIsoLokaal('2024-03-15'))).toBe('2024-03-15')
    expect(isoLokaal(parseIsoLokaal('2023-12-31'))).toBe('2023-12-31')
  })
})

describe('formatteerDatumLeesbaar', () => {
  it('geeft leesbare tekst terug, niet de kale ISO-string', () => {
    const tekst = formatteerDatumLeesbaar('2024-01-01')
    expect(tekst).not.toBe('2024-01-01')
    expect(tekst).toContain('2024')
    expect(tekst.toLowerCase()).toContain('jan')
  })
})

describe('dagenTussen', () => {
  it('telt kalenderdagen (dus inclusief weekend), niet werkdagen', () => {
    expect(dagenTussen(MAANDAG, VRIJDAG)).toBe(4)
    expect(dagenTussen(VRIJDAG, new Date(2024, 0, 8))).toBe(3) // vr -> ma, incl. weekend
  })

  it('geeft 0 voor dezelfde dag en kan negatief zijn', () => {
    expect(dagenTussen(MAANDAG, MAANDAG)).toBe(0)
    expect(dagenTussen(VRIJDAG, MAANDAG)).toBe(-4)
  })

  it('blijft correct over de voorjaars-DST-overgang heen (laatste zondag van maart)', () => {
    // 2024: DST-overgang in NL is in het weekend van 30/31 maart.
    expect(dagenTussen(new Date(2024, 2, 29), new Date(2024, 3, 1))).toBe(3)
  })
})

describe('eerstvolgendeWerkdag', () => {
  it('laat een werkdag ongemoeid', () => {
    expect(isoLokaal(eerstvolgendeWerkdag(WOENSDAG))).toBe('2024-01-03')
  })

  it('klemt zaterdag door naar maandag', () => {
    expect(isoLokaal(eerstvolgendeWerkdag(ZATERDAG))).toBe('2024-01-08')
  })

  it('klemt zondag door naar maandag', () => {
    expect(isoLokaal(eerstvolgendeWerkdag(ZONDAG))).toBe('2024-01-08')
  })
})

describe('voegWerkdagenToe', () => {
  it('0 dagen op een werkdag geeft dezelfde dag', () => {
    expect(isoLokaal(voegWerkdagenToe(WOENSDAG, 0))).toBe('2024-01-03')
  })

  it('0 dagen op een weekenddag klemt naar de eerstvolgende werkdag', () => {
    expect(isoLokaal(voegWerkdagenToe(ZATERDAG, 0))).toBe('2024-01-08')
  })

  it('telt door over een weekend heen (vrijdag + 1 werkdag = maandag)', () => {
    expect(isoLokaal(voegWerkdagenToe(VRIJDAG, 1))).toBe('2024-01-08')
  })

  it('telt meerdere werkdagen correct, weekend overslaand', () => {
    // maandag 1 jan + 4 werkdagen = vrijdag 5 jan
    expect(isoLokaal(voegWerkdagenToe(MAANDAG, 4))).toBe('2024-01-05')
    // maandag 1 jan + 5 werkdagen = maandag 8 jan (weekend overgeslagen)
    expect(isoLokaal(voegWerkdagenToe(MAANDAG, 5))).toBe('2024-01-08')
  })

  it('werkt correct over een jaargrens heen', () => {
    // vrijdag 29 dec 2023 + 1 werkdag = maandag 1 jan 2024
    expect(isoLokaal(voegWerkdagenToe(new Date(2023, 11, 29), 1))).toBe('2024-01-01')
  })

  it('gooit een fout bij een negatief aantal dagen', () => {
    expect(() => voegWerkdagenToe(MAANDAG, -1)).toThrow()
  })
})
