# CLAUDE.md — Verbouwmonitor

Deze file geeft de blijvende context voor dit project. Lees dit bij elke sessie.

## Wat dit is

Een web-app die het verbouwproces van huurwoningen monitort. De eigenaar verbouwt woningen tussen huurders door en houdt dat nu handmatig in een spreadsheet bij. De app vervangt dat: ze toont in één oogopslag waar elke verbouwing in het proces zit, wat de verwachte opleverdatum is en wat de kosten zijn.

**Kernprincipe: de app is ondersteunend, niet sturend.** Ze rekent en stelt voor; de gebruiker beslist en keurt goed. Elke wijziging die de app voorstelt (bijvoorbeeld op basis van een verwerkte mail) vereist expliciete goedkeuring van de gebruiker voordat ze doorgevoerd wordt. Dit is een MVP gericht op **inzicht en overzicht**, niet op actie-automatisering: de app benadert zelf geen partijen en verstuurt niets.

## Het domein: het verbouwproces

Een verbouwing doorloopt een vaste basisvolgorde. Niet elke stap komt bij elke woning voor (een keuken die nog goed is wordt niet vervangen). De stappen, in volgorde:

1. **Keuken vervangen** (optioneel) — inmeten, bestellen, levering (lange levertijd), montage.
2. **Vloer / keuken verwijderen** — oude vloer (en evt. keuken) eruit na vertrek huurder.
3. **Schilderen & stucen** — opmeten + offerte, daarna uitvoeren (circa 14 werkdagen).
4. **Vloer leggen** — levering, daarna leggen. Bewust ná de schilder (niet schilderen met een nieuwe vloer erin).
5. **Schoonmaak** — dag ná de vloer.
6. **Styling** — meubels plaatsen, direct na schoonmaak.
7. **Fotografie & publicatie** — fotograaf, daarna publicatie van de woning door de makelaar.

De grootste pijn in het huidige proces is niet het rekenen, maar het bewaken van **wachttijden**: tussen het benaderen van een partij en hun reactie, offerte of planning zit steeds dode tijd die de eigenaar zelf moet onthouden. De app moet die wachttijd zichtbaar maken en signaleren wanneer er iets blijft liggen.

## Het datamodel

De activiteiten-bibliotheek is een lijst **hoofdthema's**, elk met **subthema's** (subactiviteiten). De planning rekent op subthema-niveau — daar zitten de echte duren, wachttijden en kosten. Een hoofdthema is puur een groepering; het heeft zelf geen duur.

```
Thema {
  id: string
  label: string
  groep: "Voorbereiding" | "Afwerking" | "Oplevering"   // visuele groepering op schermen
  volgorde: number        // plek in de totale keten; gebruik stappen van 10 (10, 20, 30…)
  subs: Sub[]
}

Sub {
  id: string
  label: string
  duur: number       // werkdagen dat de activiteit zelf duurt
  wachttijd: number  // werkdagen tussen het einde van de vorige stap en de start van deze
                     // (dit vangt reactietijd van partijen en levertijden)
  kosten: number     // in hele euro's; 0 is toegestaan (bijv. een inmeetafspraak)
}
```

Conventies die overal gelden:

- **Werkdagen, geen kalenderdagen.** Bij het optellen van duur en wachttijd tellen zaterdag en zondag niet mee. Een activiteit van 2 werkdagen die op vrijdag start, eindigt op maandag.
- **Volgorde in stappen van 10** zodat je later een activiteit ertussen kunt schuiven (bijv. op 25) zonder alles te hernummeren.
- **Precies twee niveaus: thema en sub.** Valt een subactiviteit verder uiteen, maak er dan een eigen hoofdthema van. Diepere nesting maakt het aanvinken bij een nieuwe verbouwing en de tijdlijn onoverzichtelijk.

## De planningslogica — drie lagen

Dit is het hart van de app en de plek waar de meeste zorgvuldigheid nodig is. De drie lagen bepalen samen wanneer elke activiteit start en eindigt.

### Laag 1 — Basis-volgordelijkheid (automatische suggestie)

De app kent de standaardvolgorde (via het `volgorde`-veld) en stelt startdatums voor die op elkaar aansluiten. De regel per stap:

> start = einde van de vorige stap + eigen wachttijd (in werkdagen)
> einde = start + eigen duur − 1 (in werkdagen)

De eerste stap start op de startdatum van de verbouwing (de datum waarop de huurder vertrekt) plus de eigen wachttijd. Dit is volledig automatisch en herrekent zodra er iets verandert — een langere duur of een verschoven datum werkt door naar alle stappen erna. Dit is het vertrekpunt; de gebruiker hoeft niets in te vullen om een eerste planning te zien.

### Laag 2 — Zelf een startdatum zetten (harde verankering)

De gebruiker kan een activiteit een eigen, vaste startdatum geven. De reden dat dit nodig is: soms moet je bewust wachten (je bent in afwachting van een antwoord van een partij) en wil je een stap later zetten dan de automatische suggestie. Zo'n vaste datum is een **hard anker** met dit gedrag:

- De stap staat muurvast op die datum; de app verschuift hem niet.
- De stappen die erná komen rekenen vanaf die datum verder (ze schuiven mee).
- De stappen ervóór moeten in de resterende ruimte passen.
- **Realiteit wint:** ligt het anker later dan de automatische suggestie zou willen, dan schuift de hele keten erachter mee en verschuift de opleverdatum navenant. De planning past zich aan de vastgezette werkelijkheid aan, niet andersom.

Er zijn drie bronnen waardoor een stap vast komt te staan. Ze zijn functioneel identiek voor de berekening, maar worden visueel onderscheiden zodat de gebruiker in één oogopslag ziet *waarom* een stap vaststaat:

- **Handmatig gezet door de gebruiker** (markering 📌) — een zelfgekozen startdatum.
- **Bevestigd door een partij** (markering 🔒) — de voorgestelde datum is toegezegd, bijvoorbeeld nadat een schilder een startdag heeft bevestigd.
- **In het verleden** (markering ✓) — automatisch vast omdat de einddatum vóór vandaag ligt.

**Harde regel: activiteiten in het verleden worden nooit aangepast.** De app rekent uitsluitend aan de toekomst. Een niet-vastgezette stap mag bij herberekening nooit in het verleden landen; als de berekende startdatum vóór vandaag valt, wordt hij geklemd op de eerstvolgende werkdag vanaf vandaag.

Handmatig en bevestigd sluiten elkaar per stap uit: het één zetten wist het ander. Eén stap heeft dus altijd hooguit één anker, met één herkomst.

### Laag 3 — Parallelliteit op subactiviteit-niveau

Standaard wacht elke subactiviteit tot zijn voorganger in de keten klaar is. Soms hoeft dat niet: een subactiviteit mag gelijk starten met een andere, zodat je tijd wint. De gebruiker geeft dit per subactiviteit aan.

De regel, exact:

> Een subactiviteit kan gekoppeld worden met **"start gelijk met [andere subactiviteit]"**. De gekoppelde stap neemt dan de **startdatum** van die andere stap over, in plaats van te wachten op zijn eigen voorganger in de keten. De stappen die de gekoppelde stap als voorganger hebben, wachten vervolgens op zijn **werkelijke einddatum**.

Gevolg: gelijk starten wint tijd waar het kan, maar een opvolger wacht altijd tot de parallelle stap écht klaar is. Duurt de gekoppelde stap langer dan de stap waarmee hij meeloopt, dan wordt hij zelf de bepalende factor voor zijn opvolger.

Uitgewerkt voorbeeld: inmeten van de keuken mag gelijk starten met "vloer eruit". Beide beginnen op dezelfde dag. Bestellen (de stap ná inmeten) wacht tot inmeten klaar is — niet tot vloer eruit klaar is. Duurt inmeten 1 dag en vloer eruit 1 dag, dan kan bestellen kort erna. Duurt inmeten 3 dagen en vloer eruit 1 dag, dan wacht bestellen tot dag 3.

Twee vastgestelde eigenschappen van dit gedrag:

- **De opvolger wacht altijd op de werkelijke einddatum** van de gekoppelde stap, nooit alleen op de stap waarmee gelijk gestart werd.
- **De koppeling is een keuze per verbouwing**, geen vaste eigenschap in de bibliotheek. Dezelfde activiteit kan bij de ene woning gekoppeld zijn en bij de andere niet. De koppeling hoort dus bij de gegevens van een woning, niet bij de activiteiten-bibliotheek.

Een gekoppelde stap kan alsnog handmatig verankerd of door een partij bevestigd worden (laag 2). Een anker wint dan van de koppeling: een vastgezette datum staat vast, ongeacht de koppeling.

### Hoe de lagen samenwerken

Omdat een subactiviteit haar startdatum kan ontlenen aan haar voorganger óf aan een gekoppelde stap, en omdat opvolgers op de werkelijke einddatum van een gekoppelde stap wachten, is de planning geen simpele lijst maar een netwerk van afhankelijkheden. De startdatum van elke stap volgt uit:

- zijn eigen voorganger in de keten (standaardgeval), of
- de startdatum van zijn gekoppelde stap (als "start gelijk met" is gezet), of
- een hard anker (handmatig, bevestigd of verleden) dat alles overschrijft.

En elke opvolger wacht op de werkelijke einddatum van de stappen waarvan hij afhangt. De rekenkern moet deze afhankelijkheden correct afhandelen (zie BUILDPLAN.md, fase 2 en 3) en cykels detecteren (twee stappen die naar elkaar verwijzen).

## De vijf schermen

1. **Overzicht (dashboard)** — elke woning op één regel: adres, huidige fase met voortgangsbalk, verwachte opleverdatum, kostenprognose en een statusmarkering (op schema, of wacht op reactie). Dit is het dagelijkse monitoring-scherm, inclusief de wachttijd-signalering (welke partijen actie of opvolging nodig hebben).

2. **Nieuwe verbouwing** — invoer van een adres, een startdatum (het vertrek van de huurder, waar de planning vanaf rekent) en de keuze van werkzaamheden. De gebruiker vinkt een hoofdthema aan en alle subactiviteiten komen standaard mee; door open te klappen kan hij losse subactiviteiten uitzetten (soms hoeft de keuken alleen gemonteerd, niet ingemeten). Op basis hiervan genereert de app de eerste planning.

3. **Planning** — de gegenereerde planning als tijdlijn (een Gantt-weergave), gegroepeerd per hoofdthema met de subactiviteiten eronder. Hier zet de gebruiker startdatums (laag 2), bevestigt datums, past duren bij, en koppelt subactiviteiten om ze gelijk te laten starten (laag 3). De doorberekende datums zijn altijd zichtbaar als leesbare tekst. Accorderen maakt de planning de actieve planning van de woning.

4. **Mail verwerken** — een tussenoplossing zolang er geen echte mailkoppeling is. De gebruiker plakt een ontvangen mail (een offerte, een toegezegde datum, een gewijzigde levertijd), koppelt hem aan een woning, en de app bepaalt de impact op de planning en stelt een concrete aanpassing voor (welke datums schuiven, wat wordt de nieuwe oplevering, welke kostenwijziging). De gebruiker keurt goed of negeert. Goedkeuring is altijd verplicht.

5. **Beheer** — onderhoud van de activiteiten-bibliotheek. De gebruiker voegt hoofdthema's en subactiviteiten toe, wijzigt ze of archiveert ze, met hun duur, wachttijd, kosten en volgorde. Zo blijft de app meegroeien wanneer er een nieuw soort werk bijkomt dat nog niet in de lijst stond.

## Ontwerp- en toonprincipes

- Dit is een **werktool**, geen marketingpagina. De vormgeving is rustig, functioneel en dicht. De tijdlijn (Gantt) is het belangrijkste element van de planning: daar stuurt de gebruiker op.
- **Nederlandse interface.** Labels in de taal van de gebruiker ("Vloer leggen", niet "flooring task").
- **Data-integriteit boven gemak.** Een activiteit die in een lopende verbouwing wordt gebruikt, mag niet zomaar hard verdwijnen uit de bibliotheek; gebruik archiveren zodat bestaande verbouwingen intact blijven.
- **Toon de doorberekende datum altijd als leesbare tekst**, niet als een kaal, leeg ogend invoerveld. Een veld dat leeg lijkt, leest als "er is geen datum" en ondermijnt het vertrouwen dat de app doorrekent. Een wijzigmogelijkheid mag ernaast staan, maar de berekende datum moet altijd als tekst te lezen zijn.

## Bekende valkuilen (belangrijk)

Deze fouten zijn subtiel en breken de app op manieren die je in de UI makkelijk mist maar een test met concrete datums meteen vangt:

- **Tijdzones bij datumconversie.** Gebruik nooit `toISOString().slice(0,10)` om een lokale datum naar `YYYY-MM-DD` te brengen. Dat rekent naar UTC en schuift in de Nederlandse tijdzone een dag terug, wat een datumkiezer buiten zijn eigen minimum kan duwen en leeg laat lijken. Bouw een lokale formatter met `getFullYear()`, `getMonth()` en `getDate()`.
- **Weekend-clamp.** Wanneer een stap op "vandaag" geklemd wordt omdat hij anders in het verleden zou vallen, klem dan op de eerstvolgende *werkdag*, niet zomaar op vandaag — vandaag kan een zaterdag zijn.
- **Opleverdatum = einde van de seriële keten**, niet zomaar de laatste stap in de datastructuur. Parallel lopende of vroeg ingeplande stappen kunnen elders in de lijst eindigen maar bepalen de opleverdatum niet, zolang ze op tijd klaar zijn.
- **Doorrekening zichtbaar houden.** Als een opvolgende stap "geen datum" lijkt te hebben, is dat vrijwel altijd een weergavefout (zie het tijdzonepunt hierboven), niet een rekenfout. De keten hoort altijd door te rekenen; controleer de weergave voordat je aan de rekenkern sleutelt.

## Technische uitgangspunten

- **Scheid de planningslogica volledig van de UI.** De rekenkern (datummodel, de drie lagen, werkdagen-rekenwerk) moet bestaan als pure, framework-onafhankelijke functies die los getest kunnen worden. Dit is waar de complexiteit zit en waar fouten het meest kosten.
- **TypeScript sterk aanbevolen** gezien de datum- en afhankelijkheidslogica.
- **Persistentie is nodig:** verbouwingen, hun gekozen activiteiten, hun ankers (vastgezette en bevestigde datums) en hun parallelkoppelingen moeten bewaard blijven tussen sessies. Een vastgezette inmeetdatum moet na herladen nog vaststaan.
- **De activiteiten-bibliotheek wordt apart bewaard van de woningen**, zodat een wijziging in de bibliotheek bestaande verbouwingen niet stilzwijgend verandert.
- **Geen echte mailintegratie in de MVP.** Het scherm "Mail verwerken" werkt met handmatig geplakte tekst plus goedkeuring.
