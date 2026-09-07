// Dummy startdata voor de activiteiten-bibliotheek — zelf verzonnen, geen echte historie.
// Duur/wachttijd/kosten zijn plausibele placeholders; fase 10 (leren uit historie) vervangt
// dit door waarden die zijn afgeleid uit afgerond werk. Wijzig gerust via het Beheer-scherm.
import type { Thema } from './types'

export const BIBLIOTHEEK_SEED: Thema[] = [
  {
    id: 'keuken',
    label: 'Keuken vervangen',
    groep: 'Voorbereiding',
    volgorde: 10,
    subs: [
      { id: 'keuken-inmeten', label: 'Inmeten', duur: 1, wachttijd: 2, kosten: 0 },
      { id: 'keuken-bestellen', label: 'Bestellen', duur: 1, wachttijd: 1, kosten: 0 },
      { id: 'keuken-levering', label: 'Levering', duur: 1, wachttijd: 20, kosten: 6000 },
      { id: 'keuken-montage', label: 'Montage', duur: 3, wachttijd: 0, kosten: 1500 },
    ],
  },
  {
    id: 'verwijderen',
    label: 'Vloer / keuken verwijderen',
    groep: 'Voorbereiding',
    volgorde: 20,
    subs: [{ id: 'vloer-eruit', label: 'Oude vloer (en keuken) eruit', duur: 2, wachttijd: 0, kosten: 800 }],
  },
  {
    id: 'schilderen',
    label: 'Schilderen & stucen',
    groep: 'Afwerking',
    volgorde: 30,
    subs: [
      { id: 'schilderen-opmeten', label: 'Opmeten & offerte', duur: 1, wachttijd: 5, kosten: 0 },
      { id: 'schilderen-uitvoeren', label: 'Schilderen & stucen uitvoeren', duur: 14, wachttijd: 3, kosten: 4500 },
    ],
  },
  {
    id: 'vloer',
    label: 'Vloer leggen',
    groep: 'Afwerking',
    volgorde: 40,
    subs: [
      { id: 'vloer-levering', label: 'Levering vloer', duur: 1, wachttijd: 5, kosten: 3200 },
      { id: 'vloer-leggen', label: 'Vloer leggen', duur: 2, wachttijd: 1, kosten: 1800 },
    ],
  },
  {
    id: 'schoonmaak',
    label: 'Schoonmaak',
    groep: 'Afwerking',
    volgorde: 50,
    subs: [{ id: 'schoonmaak', label: 'Schoonmaak', duur: 1, wachttijd: 1, kosten: 350 }],
  },
  {
    id: 'styling',
    label: 'Styling',
    groep: 'Oplevering',
    volgorde: 60,
    subs: [{ id: 'styling', label: 'Meubels plaatsen', duur: 1, wachttijd: 0, kosten: 900 }],
  },
  {
    id: 'fotografie',
    label: 'Fotografie & publicatie',
    groep: 'Oplevering',
    volgorde: 70,
    subs: [
      { id: 'fotografie', label: 'Fotograaf', duur: 1, wachttijd: 2, kosten: 250 },
      { id: 'publicatie', label: 'Publicatie door makelaar', duur: 1, wachttijd: 1, kosten: 0 },
    ],
  },
]
