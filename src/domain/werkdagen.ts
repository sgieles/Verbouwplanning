// Werkdagen-rekenwerk, gecentraliseerd zoals BUILDPLAN.md fase 1 vereist.
// Let op de valkuil uit CLAUDE.md: nooit toISOString().slice(0,10) gebruiken
// voor een lokale datum — dat schuift in de Nederlandse tijdzone een dag terug.

/** Formatteert een Date als YYYY-MM-DD op basis van de lokale kalender (tijdzone-veilig). */
export function isoLokaal(datum: Date): string {
  const jaar = datum.getFullYear()
  const maand = String(datum.getMonth() + 1).padStart(2, '0')
  const dag = String(datum.getDate()).padStart(2, '0')
  return `${jaar}-${maand}-${dag}`
}

/**
 * Formatteert een YYYY-MM-DD als leesbare Nederlandse tekst (bijv. "ma 1 jan 2024").
 * Zie CLAUDE.md: een doorberekende datum moet altijd als leesbare tekst te zien zijn,
 * nooit als een kaal ogend invoerveld.
 */
export function formatteerDatumLeesbaar(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseIsoLokaal(iso))
}

/** Parseert een YYYY-MM-DD string naar een lokale Date (middernacht lokale tijd). */
export function parseIsoLokaal(iso: string): Date {
  const [jaar, maand, dag] = iso.split('-').map(Number)
  return new Date(jaar, maand - 1, dag)
}

/**
 * Aantal kalenderdagen tussen twee lokale datums (kan negatief zijn). Gebruikt voor de
 * Gantt-tijdlijn (pixels per dag). Rekent via UTC-middernacht van de kalenderdatum in plaats
 * van een kaal getTime()-verschil, zodat het resultaat nooit afhangt van tijdzone- of
 * zomertijdverschuivingen tussen de twee datums.
 */
export function dagenTussen(van: Date, tot: Date): number {
  const utcVan = Date.UTC(van.getFullYear(), van.getMonth(), van.getDate())
  const utcTot = Date.UTC(tot.getFullYear(), tot.getMonth(), tot.getDate())
  return Math.round((utcTot - utcVan) / 86_400_000)
}

function isWeekend(datum: Date): boolean {
  const dag = datum.getDay()
  return dag === 0 || dag === 6
}

/** Geeft `datum` terug als het een werkdag is, anders de eerstvolgende werkdag (maandag na een weekend). */
export function eerstvolgendeWerkdag(datum: Date): Date {
  const resultaat = new Date(datum)
  while (isWeekend(resultaat)) {
    resultaat.setDate(resultaat.getDate() + 1)
  }
  return resultaat
}

/**
 * Telt `dagen` werkdagen op bij `datum`. `dagen` moet >= 0 zijn.
 * dagen=0 geeft `datum` terug (geclampt naar een werkdag als die op een weekend valt);
 * dagen=1 geeft de eerstvolgende werkdag ná `datum`, enzovoort.
 */
export function voegWerkdagenToe(datum: Date, dagen: number): Date {
  if (dagen < 0) {
    throw new Error(`voegWerkdagenToe: dagen mag niet negatief zijn (kreeg ${dagen})`)
  }
  let resultaat = eerstvolgendeWerkdag(new Date(datum))
  let resterend = dagen
  while (resterend > 0) {
    resultaat.setDate(resultaat.getDate() + 1)
    resultaat = eerstvolgendeWerkdag(resultaat)
    resterend -= 1
  }
  return resultaat
}
