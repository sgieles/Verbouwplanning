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

/** Parseert een YYYY-MM-DD string naar een lokale Date (middernacht lokale tijd). */
export function parseIsoLokaal(iso: string): Date {
  const [jaar, maand, dag] = iso.split('-').map(Number)
  return new Date(jaar, maand - 1, dag)
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
