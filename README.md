# RETRO SNAKE

Minimalna Snake igra sa 20 × 20 mrežom, retro izgledom, TypeScript browser klijentom i autoritativnim TypeScript serverom.

## Lokalni razvoj

Potrebno je Node.js 22 ili noviji.

U prvom terminalu instaliraj zavisnosti i pokreni Vite klijent:

```bash
npm install
npm run dev
```

U drugom terminalu pokreni TypeScript backend:

```bash
npm run dev:server
```

Otvori adresu koju Vite ispiše (podrazumevano `http://localhost:5173`).

## Build i pokretanje iz build-a

Napravi produkcioni build klijenta:

```bash
npm run build
```

Build proverava TypeScript i pravi frontend fajlove u `dist/`. Za lokalno pokretanje build-a, ostavi backend aktivan u jednom terminalu:

```bash
npm start
```

Zatim u drugom terminalu pokreni Vite preview:

```bash
npm run preview
```

Otvori adresu koju preview ispiše (podrazumevano `http://localhost:4173`). Preview prosleđuje `/api` HTTP i WebSocket saobraćaj backend-u.

Pritisni strelicu da započneš partiju. Strelice menjaju smer, `P` ili `Space` pauziraju, a `R` ili dugme `NEW GAME` vraćaju igru u početno stanje. Server poseduje stanje igre i više nezavisnih single-player game containera; svaki container trenutno ima jednog igrača. Rekord se čuva lokalno u browseru. Dok je partija aktivna ili pauzirana, `ASK AI FOR HINT` koristi isključivo lokalni fake/read-only tok — nema eksternog AI poziva niti može menjati igru.

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
- `docs/specs/` — autoritativni opis igre, refactor plan i read-only tool contract.
- `docs/specs/REFACTOR_PLAN.md` — refactor odluke, Definition of Done, out-of-scope i ček-lista provera.
- `docs/prompts/` — build promptovi, uključujući server refactor.
- `docs/tracking/` — work log, AI usage log, task-specific evidence, Week 3/4 checklists and guides, i weekly reports.

Za promene prati obavezni workflow u `docs/instructions/05-workflow-tracking-and-reporting.md`. Njegov cilj je da stvarni rad i rezultati ostanu zabeleženi i da nedeljni izveštaj može da se sastavi iz tih zapisa.
