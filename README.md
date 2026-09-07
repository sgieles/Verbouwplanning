# Verbouwplanning — Verbouwmonitor

Web-app die het verbouwproces van huurwoningen monitort: in één oogopslag zien waar elke
verbouwing in het proces zit, wat de verwachte opleverdatum is en wat de kosten zijn.

Zie [CLAUDE.md](./CLAUDE.md) voor de volledige domeincontext (datamodel, de drie planninglagen,
ontwerpprincipes) en [BUILDPLAN.md](./BUILDPLAN.md) voor het gefaseerde bouwplan.

## Status

Rekenkern (fase 0 t/m 3 van BUILDPLAN.md) staat: datamodel, werkdagen-helpers, en de planning
inclusief verankering (📌/🔒/✓) en parallelliteit op subactiviteit-niveau ("start gelijk met").
De schermen (Overzicht, Nieuwe verbouwing, Planning, Beheer, Mail verwerken) en persistentie
volgen in de fasen daarna.

## Ontwikkelen

```bash
npm install
npm run dev      # start de dev-server
npm test         # draait de testsuite (Vitest) eenmalig
npm run test:watch
npm run build     # typecheck + productiebuild
```
