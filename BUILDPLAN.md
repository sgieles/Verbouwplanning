# BUILDPLAN.md — Verbouwmonitor

Gefaseerd bouwplan. Lees eerst CLAUDE.md voor de domeincontext en de volledige beschrijving van het datamodel en de planningslogica. Bouw de fasen in volgorde; elke fase is los te testen en op te leveren.

---

## Fase 0 — Projectopzet & architectuur

**Doel:** een onderhoudbare basis waarop de rest gebouwd wordt.

- Zet een projectstructuur op (Vite + React aanbevolen, of een gelijkwaardig framework). Gebruik TypeScript vanwege de datum- en afhankelijkheidslogica.
- Kies een heldere mappenstructuur met een strikte scheiding:
  - `domain/` — het datamodel en de planningsfuncties, volledig framework-onafhankelijk en puur (geen UI, geen state-bibliotheek).
  - `components/` — de schermen en visuele onderdelen.
  - `state/` — de opslag- en toestandslaag.
- Zet een testrunner op (Vitest of gelijkwaardig). De planningslogica wordt met unit-tests gedekt.

**Definitie van klaar:** het project draait, de mappenstructuur staat, en er is een eerste (mag triviale) test die groen draait.

## Fase 1 — Datamodel & werkdagen-fundament

**Doel:** de bouwstenen waarop alle berekening rust, getypeerd en getest.

- Definieer de types uit CLAUDE.md: `Thema`, `Sub`, en de afgeleide types voor een geplande stap (met start, eind, en of hij vaststaat en waarom).
- Bouw de werkdagen-helpers als pure, geteste functies:
  - `voegWerkdagenToe(datum, aantal)` — telt werkdagen op, slaat weekends over.
  - `eerstvolgendeWerkdag(datum)` — geeft de datum zelf terug, of de eerstvolgende maandag als het weekend is.
  - `isoLokaal(datum)` — geeft `YYYY-MM-DD` op basis van de lokale datumvelden (níét via `toISOString`; zie de valkuil in CLAUDE.md).
- Schrijf tests voor deze helpers, inclusief randgevallen: optellen over een weekend heen, een datum die zelf op zaterdag valt, jaargrenzen.

**Definitie van klaar:** de helpers hebben tests die weekends en de tijdzone-valkuil afdekken.

## Fase 2 — Planningskern: laag 1 en laag 2

**Doel:** de automatische planning en de harde verankering, als pure functies met een testsuite.

Bouw de rekenkern die uit een verbouwing (gekozen activiteiten + ankers) een volledige planning berekent. Implementeer eerst laag 1 en laag 2 uit CLAUDE.md.

**Laag 1 — automatische volgordelijkheid:**
- Sorteer de gekozen activiteiten op `volgorde`.
- Bereken per stap: start = einde vorige + eigen wachttijd; einde = start + duur − 1, alles in werkdagen.
- De opleverdatum is het einde van de laatste stap in de keten.

**Laag 2 — harde verankering:**
- Een stap kan een anker hebben met een datum en een bron (`handmatig`, `bevestigd` of `verleden`).
- Een verankerde stap staat vast op zijn datum; opvolgers rekenen daarvandaan verder.
- Als een berekende (niet-verankerde) stap in het verleden zou vallen, klem hem op de eerstvolgende werkdag vanaf vandaag.
- Een stap met einddatum vóór vandaag krijgt automatisch het anker `verleden` en wordt nooit meer verplaatst.
- Realiteit-wint: ligt een anker later dan de automatische suggestie, dan schuift de keten erachter mee en verschuift de oplevering.

Schrijf de tests met concrete datums, want hier zitten de subtiele fouten:
- Lege verbouwing rekent netjes door: als de schilder klaar is, start de vloer erna (plus wachttijd), enzovoort.
- Anker later dan het voorstel: keten schuift mee, oplevering verschuift.
- Anker vroeger dan het voorstel: verankert correct, opvolgers sluiten aan.
- Stap in het verleden wordt niet aangeraakt; een niet-verankerde stap landt nooit vóór vandaag.

**Definitie van klaar:** de rekenkern berekent laag 1 en laag 2 correct, met een testsuite die de bovenstaande gevallen en de valkuilen uit CLAUDE.md dekt.

## Fase 3 — Planningskern: laag 3 (parallelliteit op subactiviteit-niveau)

**Doel:** subactiviteiten kunnen gelijk starten met een andere, met correcte doorwerking naar opvolgers.

Dit is de meest complexe laag en verandert de planning van een simpele lijst in een netwerk van afhankelijkheden. Lees de definitie van laag 3 in CLAUDE.md volledig voordat je begint.

**Datamodel:**
- Voeg per verbouwing een koppelstructuur toe, bijvoorbeeld een afbeelding van subactiviteit naar de subactiviteit waarmee gelijk gestart wordt (`{ [subId]: gelijkMetSubId }`). Dit hoort bij de gegevens van een woning, níét bij de bibliotheek.

**Berekening:**
- De startdatum van een stap volgt uit één van drie bronnen, in deze prioriteit: een hard anker (wint altijd), anders de startdatum van zijn gekoppelde stap ("start gelijk met"), anders zijn voorganger in de keten.
- Elke opvolger wacht op de **werkelijke einddatum** van de stap(pen) waarvan hij afhangt — dus bij een gekoppelde stap op diens einddatum, ook als die later klaar is dan de stap waarmee gelijk gestart werd.
- Verwerk de afhankelijkheden via een topologische afhandeling in plaats van een enkele lus. Detecteer cykels (A start gelijk met B en B met A) en geef daar een nette foutmelding op in plaats van vast te lopen.

**Canoniek testgeval (schrijf dit als eerste, vóór de implementatie):**

Twee subactiviteiten: "vloer eruit" (duur 1) en "inmeten" (duur variabel). Zonder koppeling loopt inmeten serieel. Met de koppeling "inmeten start gelijk met vloer eruit":
- Beide starten op dezelfde dag.
- "Bestellen" (de opvolger van inmeten) wacht tot inmeten klaar is.
- Variant A — inmeten duurt 1 dag: bestellen sluit kort aan (met bestellen's eigen wachttijd).
- Variant B — inmeten duurt 3 dagen: bestellen wacht tot dag 3, ook al was vloer eruit al op dag 1 klaar.

Test daarnaast dat een anker op een gekoppelde stap wint van de koppeling, en dat een cykel netjes wordt afgevangen.

**Definitie van klaar:** het canonieke testgeval slaagt in beide varianten, ankers winnen van koppelingen, en cykels geven een nette fout.

## Fase 4 — Persistentie

**Doel:** verbouwingen en al hun keuzes blijven bewaard tussen sessies.

- Kies een opslaglaag. Begin desnoods met browseropslag (localStorage of IndexedDB); een echte backend kan later.
- Modelleer en bewaar per woning: adres, startdatum, gekozen activiteiten (welke subs aan staan), aangepaste duren, ankers (datum + bron per subactiviteit) en parallelkoppelingen.
- Bewaar de activiteiten-bibliotheek apart van de woningen, zodat een wijziging in de bibliotheek bestaande verbouwingen niet stilzwijgend verandert.

**Definitie van klaar:** je maakt een verbouwing aan, zet een datum vast en legt een koppeling, herlaadt de app, en alles staat er nog precies zo.

## Fase 5 — Scherm: Nieuwe verbouwing

**Doel:** een verbouwing kunnen aanmaken die meteen een planning oplevert.

- Invoer: adres, startdatum (vertrek huurder), en de keuze van werkzaamheden.
- De keuze werkt op twee niveaus: de gebruiker vinkt een hoofdthema aan en alle subactiviteiten komen standaard mee. Door een aangevinkt thema open te klappen kan hij losse subactiviteiten uitzetten.
- Bij bevestigen genereert de app de eerste planning (laag 1) en opent het planning-scherm.

**Definitie van klaar:** een nieuwe verbouwing aanmaken leidt tot een gevulde, doorgerekende planning.

## Fase 6 — Scherm: Planning (de tijdlijn)

**Doel:** het scherm waar de gebruiker de planning ziet en bijstuurt. Dit is het zwaartepunt van de app.

- Toon de planning als tijdlijn (Gantt), gegroepeerd per hoofdthema met de subactiviteiten eronder. Elk hoofdthema toont een samenvatting (periode en kosten van dat blok).
- Toon bovenaan de kerncijfers: verwachte oplevering, totale kosten (prognose), aantal stappen.
- Per subactiviteit kan de gebruiker:
  - een **startdatum zetten** (laag 2, markering 📌) via een datumkiezer;
  - een datum **bevestigen** als toegezegd door een partij (laag 2, markering 🔒); bied hierbij een datumveld aan zodat de dóór de partij toegezegde datum ingevoerd kan worden, die kan afwijken van de suggestie;
  - de **duur bijstellen**;
  - de stap **koppelen** met "start gelijk met [andere stap]" (laag 3), en die koppeling weer losmaken. Bied alleen stappen aan die eerder of gelijk in de keten liggen — je kunt niet gelijk starten met iets dat later komt.
- Verstreken stappen (markering ✓) staan vast en tonen geen bewerkacties.
- Maak de herkomst van elke vaste datum zichtbaar via de drie markeringen (📌 / 🔒 / ✓).
- Toon een gekoppelde stap in de tijdlijn op dezelfde starthoogte als zijn koppelstap, met een leesbaar label (bijvoorbeeld "gelijk met vloer eruit").
- Signaleer wanneer een vroeg in te plannen stap door een lange doorlooptijd niet meer op tijd past, zodat de gebruiker ziet dat die stap de oplevering gaat bepalen.
- Elke doorberekende datum staat als **leesbare tekst** in beeld (zie het ontwerpprincipe in CLAUDE.md).
- Accorderen ("planning vastzetten") maakt dit de actieve planning van de woning.

**Definitie van klaar:** de gebruiker kan alle drie de lagen bedienen vanaf dit scherm, ziet het effect direct in de tijdlijn, en kan de planning vastzetten.

## Fase 7 — Scherm: Overzicht met wachttijd-bewaking

**Doel:** het dagelijkse monitoring-scherm dat de kernpijn van de gebruiker adresseert — bewaken welke partij actie of opvolging nodig heeft.

- Toon elke woning op één regel: adres, huidige fase met voortgangsbalk, verwachte opleverdatum, kostenprognose en een statusmarkering.
- Bereken de status: detecteer stappen waarvan de start nadert of al verstreken is zonder bevestiging, en stappen waarop al lang gewacht wordt op een reactie (benaderd, maar nog geen toegezegde datum). Markeer die woningen duidelijk ("wacht op reactie").
- Om wachttijd tegen de werkelijkheid te kunnen meten in plaats van alleen tegen de planning, is waarschijnlijk een extra gegeven per stap nodig: "benaderd op [datum]". Neem dat mee in het datamodel wanneer je deze fase bouwt.
- Overweeg een aparte "vandaag te doen"-lijst: alle woningen waar nu iets moet gebeuren.

**Definitie van klaar:** de gebruiker opent het overzicht en ziet zonder zoeken welke partijen actie of opvolging nodig hebben, en welke woning daardoor dreigt te vertragen.

## Fase 8 — Scherm: Beheer

**Doel:** de activiteiten-bibliotheek kan meegroeien zonder lopende verbouwingen te breken.

- De gebruiker kan hoofdthema's en subactiviteiten toevoegen, wijzigen (label, duur, wachttijd, kosten, volgorde) en archiveren.
- **Archiveren in plaats van hard verwijderen:** een gearchiveerde activiteit is niet meer aanvinkbaar voor nieuwe verbouwingen, maar bestaande woningen die hem gebruiken blijven intact.
- Waarschuw bij het wijzigen van duur of wachttijd van een activiteit die in lopende verbouwingen zit: verandert dit de bibliotheek voor toekomstige verbouwingen, of ook de bestaande? Maak dat expliciet.
- Een nieuwe activiteit heeft nog geen doorlooptijd-historie; laat de gebruiker duur en wachttijd met de hand invullen.

**Definitie van klaar:** een nieuw soort werk toevoegen verschijnt meteen bij een nieuwe verbouwing, en archiveren breekt geen bestaande planning.

## Fase 9 — Scherm: Mail verwerken

**Doel:** de tussenoplossing zonder echte mailkoppeling bruikbaar maken.

- De gebruiker plakt een ontvangen mail en koppelt hem aan een woning.
- De app analyseert de tekst: herken toegezegde datums, gewijzigde levertijden en bedragen, en bepaal welke stap het raakt.
- Toon de impact als een concreet voorstel: welke datums schuiven, wat wordt de nieuwe oplevering, welke kostenwijziging.
- Bij goedkeuren wordt het voorstel doorgevoerd via de verankeringslogica (een toegezegde datum wordt een 🔒-anker). Bij negeren blijft alles ongemoeid. **Goedkeuring is altijd verplicht** — bouw geen stille automatische doorvoering.

**Definitie van klaar:** een geplakte mail leidt tot een concreet, goed te keuren voorstel dat na goedkeuring correct in de planning landt.

## Fase 10 — Leren uit historie (later)

**Doel:** de suggesties scherper maken op basis van echte data.

- Leid duur en wachttijd per activiteit af uit afgerond werk (er is een jaar aan bestaande registratie).
- Houd per partij ook de betrouwbaarheid bij — bijvoorbeeld hoeveel later een partij gemiddeld reageert of levert dan toegezegd — zodat de planning realistischer wordt en de wachttijd-bewaking (fase 7) beter kan waarschuwen.

---

## Aanbevolen bouwvolgorde

0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

De rekenkern (fasen 1 t/m 3) komt bewust vóór de schermen. Parallelliteit (fase 3) raakt de planning fundamenteel; die later inbouwen betekent de rekenkern opnieuw omgooien, dus hij hoort direct na de basisberekening. Zodra de kern en persistentie staan, zijn de schermen erop te bouwen. Fase 7 (wachttijd-bewaking) is functioneel de belangrijkste voor de gebruiker en mag naar voren zodra de rekenkern en het overzicht bestaan.

## Werkafspraken

- **Test de planningslogica los, met concrete datums.** De lastigste fouten in dit domein zitten in datum- en tijdzone-afhandeling en in het doorrekenen van afhankelijkheden — precies wat een unit-test met echte datums vangt en een blik op de UI mist.
- **Raak het verleden nooit aan** in de planner. Dit is een harde regel: de app rekent alleen aan de toekomst.
- **Elke door de app voorgestelde wijziging vereist goedkeuring van de gebruiker.** Bouw geen stille automatische doorvoeringen.
- **Houd doorberekende datums zichtbaar als tekst.** Een leeg ogend datumveld leest als "geen datum" en ondermijnt het vertrouwen dat de app doorrekent.
