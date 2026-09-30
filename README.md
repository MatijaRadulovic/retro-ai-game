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

Pritisni strelicu da započneš partiju. Strelice menjaju smer, `P` ili `Space` pauziraju, a `R` ili dugme `NEW GAME` vraćaju igru u početno stanje. Server poseduje stanje igre i više nezavisnih single-player game containera; svaki container trenutno ima jednog igrača. Rekord se čuva lokalno u browseru. Otvori `SHOP` da pauziraš i vidiš perkove; `ASK SHOP AI` predlaže kupovinu Extra XP, Luck, +1 Life ili čekanje. Savet nikad ne kupuje perk — kupovina ostaje poseban klik.

Shop advisor koristi jedan pokušaj Gemini 3.8 Flash, do dva pokušaja Gemini 3.5 Flash-Lite, pa do tri pokušaja Gemma 4 26B A4B IT kada je fallback dozvoljen. Backend čita `GEMINI_API_KEY` samo iz svog runtime okruženja. Ključ unesi samo u terminal iz kog pokrećeš backend; ovo ga drži van repozitorijuma, Vite konfiguracije i browser build-a, da ne bi bio slučajno commit-ovan ili poslat korisnicima.

Na Linux/macOS-u, u drugom terminalu unesi ključ bez prikaza i pokreni backend:

```bash
read -s -p "Gemini API key: " GEMINI_API_KEY
printf '\n'
export GEMINI_API_KEY
npm run dev:server
```

Posle zaustavljanja servera (`Ctrl+C`) ukloni ga iz terminal okruženja:

```bash
unset GEMINI_API_KEY
```

Na Windows PowerShell-u koristi skriveni unos:

```powershell
$secureKey = Read-Host "Gemini API key" -AsSecureString
$env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
npm run dev:server
```

Posle zaustavljanja servera (`Ctrl+C`) očisti promenljivu:

```powershell
Remove-Item Env:GEMINI_API_KEY
$secureKey = $null
```

Pokreni Vite u posebnom terminalu kao gore opisano; nemoj postavljati `VITE_GEMINI_API_KEY` niti dodavati ključ u `.env`, source code, komandu koja sadrži njegovu vrednost, ili commit. Bez konfigurisanog ključa shop prikazuje bezbednu poruku da savet nije dostupan. Stvarni limiti za sva tri modela zavise od Google AI Studio projekta.

Backend za svaki provider pokušaj ispisuje jedan JSON telemetry red sa modelom, rednim brojem pokušaja, bezbednom klasom ishoda, trajanjem, fallback statusom i token usage podacima kada ih Google vrati. Log namerno ne sadrži ključ, prompt, odgovor modela, game/session ID ni privatne shop vrednosti.

## Provera

```bash
npm run typecheck
npm test
npm run build
npm run security:scan
```

## Dokumentacija

- `AGENTS.md` — kratak, uvek važeći projektni ugovor.
- `docs/INSTRUCTIONS.md` — indeks detaljnih instrukcija, specifikacija i evidencija.
- `docs/instructions/` — pravila po temi: arhitektura, kod, AI/security, provere i workflow.
- `docs/specs/` — autoritativni opis igre, refactor plan i read-only shop context contract.
- `specs/002-shop-advisor/` — Spec Kit specifikacija, plan, API ugovor, zadaci i quickstart za shop savet.
- `docs/specs/REFACTOR_PLAN.md` — refactor odluke, Definition of Done, out-of-scope i ček-lista provera.
- `docs/prompts/` — build promptovi, uključujući server refactor.
- `docs/tracking/` — work log, AI usage log, task-specific evidence, Week 3/4 checklists and guides, i weekly reports.

Za promene prati obavezni workflow u `docs/instructions/05-workflow-tracking-and-reporting.md`. Njegov cilj je da stvarni rad i rezultati ostanu zabeleženi i da nedeljni izveštaj može da se sastavi iz tih zapisa.
