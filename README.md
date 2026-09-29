# RETRO SNAKE

Minimalna browser igra Snake sa 20 × 20 mrežom, retro izgledom i čistom TypeScript logikom.

## Lokalni razvoj

```bash
npm install
npm run dev
```

Pritisni strelicu da započneš partiju. Strelice menjaju smer, `P` ili `Space` pauziraju, a `R` ili dugme `NEW GAME` vraćaju igru u početno stanje. Rekord se čuva lokalno u browseru. Dok je partija aktivna ili pauzirana, `ASK AI FOR HINT` koristi isključivo lokalni fake/read-only tok — nema mrežnog poziva niti može menjati igru.

## Provera

```bash
npm run typecheck
npm test
npm run build
```

## Dokumentacija

- `AGENTS.md` — kratak, uvek važeći projektni ugovor.
- `docs/INSTRUCTIONS.md` — indeks detaljnih instrukcija, specifikacija i evidencija.
- `docs/instructions/` — pravila po temi: arhitektura, kod, AI/security, provere i workflow.
- `docs/specs/` — autoritativni opis igre i read-only tool contract.
- `docs/prompts/` — početni i finalni build prompt.
- `docs/tracking/` — work log, AI usage log, task-specific evidence, Week 3/4 checklists and guides, i weekly reports.

Za promene prati obavezni workflow u `docs/instructions/05-workflow-tracking-and-reporting.md`. Njegov cilj je da stvarni rad i rezultati ostanu zabeleženi i da nedeljni izveštaj može da se sastavi iz tih zapisa.
