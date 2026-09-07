# BUILDPLAN.md — Verbouwmonitor

Gefaseerd bouwplan voor de Verbouwmonitor. Lees eerst CLAUDE.md voor de domeincontext.

## Status

Fase 0 t/m 9 zijn afgerond — alleen **fase 10** staat nog open (wacht op de echte historische
data van de gebruiker). Live op **https://sgieles.github.io/Verbouwplanning/**, automatisch
gebouwd en gepubliceerd via GitHub Actions bij elke push naar `main`
(`.github/workflows/deploy.yml`, test + typecheck als poort). Data blijft per bezoeker lokaal
in de browser (localStorage) — geen gedeelde backend.

De gedetailleerde bouwinstructies per afgeronde fase staan niet meer hieronder, alleen een
samenvatting van wat er staat — de volledige oorspronkelijke tekst staat in de git-historie
van dit bestand.

---

## Afgerond

- **Fase 0 — Projectopzet** ✅ Vite + React + TypeScript; `domain/` (puur) · `components/` · `state/`; Vitest.
- **Fase 1 — Datamodel & werkdagen** ✅ `Thema`/`Sub`/`GeplandeSub`-types; `voegWerkdagenToe`, `eerstvolgendeWerkdag`, `isoLokaal` (tijdzone-veilig) — getest.
- **Fase 2 — Laag 1 + 2** ✅ Automatische volgordelijkheid + harde verankering (📌/🔒/✓) — getest met concrete datums.
- **Fase 3 — Laag 3 (parallelliteit)** ✅ "Start gelijk met"-koppelingen, topologisch opgelost, cyclusdetectie. Canoniek testgeval (beide varianten) slaagt.
- **Fase 4 — Persistentie** ✅ localStorage; bibliotheek en woningen apart bewaard.
- **Fase 5 — Nieuwe verbouwing** ✅ Adres + startdatum + checkbox-boom (thema/sub) → directe planning.
- **Fase 6 — Planning** ✅ Gantt-tijdlijn; alle drie de lagen bedienbaar (📌/🔒/duur/koppelen); accorderen.
- **Fase 7 — Overzicht** ✅ Voortgangsbalk, status, "vandaag te doen" (nadert-onbevestigd / wacht-op-reactie).
- **Fase 8 — Beheer** ✅ Toevoegen/wijzigen/archiveren; bevestiging bij wijzigen van een in-gebruik-zijnde activiteit of bij verwijderen.
- **Fase 9 — Mail verwerken** ✅ Tekstanalyse (activiteit/datum/bedrag) → voorstel met diff → verplichte goedkeuring.
- **Deployment** ✅ GitHub Pages via GitHub Actions.

---

## Fase 10 — Leren uit historie (open, later)

**Doel:** de suggesties scherper maken op basis van echte data.

- Leid duur en wachttijd per activiteit af uit afgerond werk (er is een jaar aan bestaande registratie).
- Houd per partij ook de betrouwbaarheid bij (bijv. hoeveel later een partij gemiddeld reageert of levert dan toegezegd), zodat de wachttijd-bewaking (fase 7) beter kan waarschuwen.

## Werkafspraken

- **Test de planningslogica los, met concrete datums.**
- **Raak het verleden nooit aan** in de planner.
- **Elke door de app voorgestelde wijziging vereist goedkeuring van de gebruiker.**
- **Houd doorberekende datums zichtbaar als tekst**, nooit een leeg ogend invoerveld.
