# W08 Secure the Arcade — plan rada i provera po sekcijama

Ovaj dokument prevodi [W08 zadatak](02-Nedeljni-zadatak-Secure-the-Arcade.md) u redosled rada prilagođen RETRO SNAKE projektu. Ne predstavlja dokaz da je zaštita implementirana. Stvarni rezultati, izlazi komandi i ograničenja treba da budu zapisani u budućem `EVIDENCE_W08.md` tek nakon izvršenja.

## Kako koristimo ovaj dokument

- Ovaj master-checklist je redosled rada. Faze se izvršavaju odozgo nadole.
- Stavka se menja u `[x]` samo kada postoji traženi artefakt ili stvarni izlaz komande u `EVIDENCE_W08.md`.
- Tekst u specifikaciji ili planu nije dokaz da kontrola radi.
- Ako je provera blokirana, ostaje `[ ]` i uz nju se upisuje `BLOCKED`, razlog i sledeća konkretna akcija.
- Ne prelazimo na implementaciju dok **Gate P** nije zatvoren. Ne proglašavamo zadatak završenim dok **Gate D** nije zatvoren.
- Za svaku kontrolu mora ostati lanac: **pretnja → pravilo → mesto kontrole → izvršiv test → posmatrani rezultat**.

## Master execution checklist

### Faza P0 — Opseg i početne odluke

- [x] Izabran je W05 Shop Strategist kao tok koji se ojačava.
- [x] Potvrđeno je da agent ostaje read-only i koristi isti Google model chain.
- [x] Potvrđeno je da nema login-a, baze, novog providera, write alata ili multiplayer-a.
- [x] Definisana je no-login granica: privremeni session scope + obavezni globalni backstop.
- [x] Zabeležen je početni code checkpoint `973daec6e526c2369347f43a2b68b3f529b8c53d`.

### Faza P1 — Zatvaranje dokumentacije pre implementacije

- [x] Napisan je code-referenced audit sa najmanje šest rizika.
- [x] Izdvojena su tri prioriteta: session/ownership, resource governance i agent/browser assurance.
- [x] Kreirani su SpecKit `spec.md`, `plan.md`, research, data model, ugovori i quickstart.
- [x] Definisani su konkretni početni limiti.
- [ ] Dodati posebnu normativnu sekciju I1–I8 direktno u `specs/004-secure-agent-boundaries/spec.md`.
- [ ] Napraviti `specs/004-secure-agent-boundaries/tasks.md` sa dependency redosledom i test-first zadacima.
- [ ] Napraviti skeleton `EVIDENCE_W08.md` pre promene koda; rezultati ostaju `NOT RUN` dok se stvarno ne izvrše.
- [ ] U `EVIDENCE_W08.md` dodati stvarni Mermaid dijagram arhitekture i trust boundary-ja.
- [ ] U `EVIDENCE_W08.md` dodati kompletan data-flow inventar: kontrolor, validacija, upotreba, model, čuvanje.
- [ ] Zamrznuti očekivanja za T00–T17 i CSRF pre implementacije.
- [ ] Zamrznuti tri BEFORE/AFTER scenarija: T03, T13 i T09/T10.
- [ ] Svaki T scenario povezati sa fixture-om, test-fajlom, tipom testa i komandom.
- [ ] Napisati osmomimutni demo scenario iz odeljka „Demo plan“.

**Gate P — planiranje završeno:** sve stavke P1 su `[x]`; specifikacija, plan, tasks i evidence skeleton se međusobno ne sukobljavaju.

### Faza B — Baseline pre implementacije

- [ ] Popraviti lokalni dependency/toolchain setup tako da koristi verzije iz repozitorijuma/lockfile-a.
- [ ] Zabeležiti `git status`, branch, puni SHA, Node i npm verziju.
- [ ] Pokrenuti i sačuvati zaseban izlaz `npm run typecheck`.
- [ ] Pokrenuti i sačuvati zaseban izlaz `npm test`.
- [ ] Pokrenuti i sačuvati zaseban izlaz `npm run build`.
- [x] Pokrenut je početni `npm run security:scan`; rezultat je uspešan.
- [x] Pokrenut je početni `npm audit --json`; dva high zbirna nalaza su dokumentovana.
- [ ] Pokrenuti normalni W05 fake tok i sačuvati: najmanje 2 model koraka, 1 stvarni tool poziv i validan final.
- [ ] Sačuvati snapshot/revision i provider/tool brojače pre i posle W05 baseline-a.
- [ ] Pokrenuti tri zamrznuta BEFORE scenarija i zapisati stvarne rezultate, uključujući postojeće zaštite.

**Gate B — baseline sačuvan:** nijedna aplikaciona izmena nije počela pre zabeleženih rezultata ili eksplicitnog `BLOCKED` zapisa.

### Faza I1 — Session, ownership i request provenance

- [ ] Napisati failing testove za session bootstrap, expiry, verifier, media type i origin.
- [ ] Napisati A/B testove za GET, mutacije, oba AI toka i WebSocket.
- [ ] Implementirati server-issued session scope koji nije vidljiv modelu ili tool argumentima.
- [ ] Vezati svaku partiju za interni owner scope; `gameId` ostaje samo identifikator.
- [ ] Enforcovati ownership pre čitanja, mutacije, provider-a i tool-a.
- [ ] Enforcovati CSRF/request verifier i tačan Origin na primenljivim browser zahtevima.
- [ ] Enforcovati isti session/ownership/origin kontekst na WebSocket upgrade-u.
- [ ] Enforcovati `application/json`, pre-parse body limit i exact-key schema.
- [ ] Potvrditi: svaki early reject ima `providerAttempts=0`, `toolCalls=0` i bez promene stanja.
- [ ] Potvrditi: pozitivni A→A i normalni W05 tok i dalje rade.

**Gate I1:** T01, T02, T03, T08, T15 i CSRF imaju negativnu i pozitivnu kontrolu.

### Faza I2 — Rate, concurrency, lifecycle i deadline

- [ ] Napisati failing testove sa fake clock-om i deferred provider-om.
- [ ] Implementirati jedan zajednički in-memory resource governor.
- [ ] Enforcovati 1 aktivan agent run po session scope-u i 2 globalno.
- [ ] Enforcovati 5 prihvatanja/60 s po session scope-u i 20/60 s globalno.
- [ ] Enforcovati 3 aktivne partije po scope-u i 100 globalno.
- [ ] Enforcovati subscription limite i idempotent lease release.
- [ ] Implementirati idle cleanup bez izbacivanja aktivnog/pinovanog resursa.
- [ ] Pratiti raw provider posao koji ignoriše abort; kasni rezultat ne sme postati success.
- [ ] Potvrditi oslobađanje kapaciteta posle success/failure/cancel/deadline-a.
- [ ] Potvrditi da novi game/session ne resetuje globalni backstop.

**Gate I2:** T11, T12, T13 i T17 prolaze; izmereni maksimum nikada ne prelazi politiku.

### Faza I3 — Agent/tool/final assurance

- [ ] Napisati failing testove za raw/oversized/additional/secret-bearing tool rezultate.
- [ ] Parsirati tool rezultat u novi normalizovani DTO pre model transcript-a.
- [ ] Zadržati zatvoren registry i odbiti unknown, inherited, write, network, file i shell alate.
- [ ] Uvesti structured evidence fact reference umesto slobodne modelske činjenične rečenice.
- [ ] Generisati prikaz evidence-a iz validiranih serverskih činjenica.
- [ ] Centralizovati plain-text politiku za C0/C1, bidi, zero-width, tag, Markdown i URL sadržaj.
- [ ] Provesti malicious-provider/prompt-injection fixture kroz stvarni HTTP→agent→tool put.
- [ ] Potvrditi da injection ne menja allowlist, scope, budžet ili kanonsko stanje.
- [ ] Potvrditi da validan strukturirani plan i dalje prolazi.

**Gate I3:** T06, T07, T09 i T10 prolaze sa eksplicitnim provider/tool/state brojačima.

### Faza I4 — Security events, browser i production profil

- [ ] Napisati exact-schema testove za admission/access/limit/tool/provider/run događaje.
- [ ] Implementirati server-generated correlation ID i enumerisane reason kodove.
- [ ] Potvrditi da log ne sadrži game/session ID, cookie/verifier, prompt, raw result, stack ili ključ.
- [ ] Potvrditi da newline/log-forging fixture pravi samo očekivani JSON događaj.
- [ ] Dodati CSP, `nosniff` i `no-referrer` na lokalni production preview.
- [ ] Dodati Playwright test stvarnog DOM-a za T04/T05.
- [ ] Dokazati CSP blokadu resursom koji nezavisno vraća HTTP 200.
- [ ] Potvrditi da normalan tekst, srpska slova, apostrof i `a < b` rade.
- [ ] Potvrditi da production igra, WebSocket i W05 fake agent rade pod CSP-om.
- [ ] Proveriti sintetički sentinel u bundle-u, source map-u, response-u, model kontekstu i logu.

**Gate I4:** T04, T05, T14 i T16 imaju browser/production dokaz i pozitivne kontrole.

### Faza V — Kompletna verifikacija i evidence

- [ ] Dodati jednu ponovljivu offline komandu `npm run test:security`.
- [ ] Automatizovati T00–T15 i T17; T04/T05 moraju koristiti stvarni browser.
- [ ] Dokumentovati automatizovani i eventualni ručni deo T16.
- [ ] Ponovo pokrenuti ista tri AFTER scenarija i uporediti ih sa BEFORE rezultatima.
- [ ] Popuniti observed rezultate, brojače i lokacije za T00–T17 i CSRF u `EVIDENCE_W08.md`.
- [ ] Pokrenuti `npm run typecheck`.
- [ ] Pokrenuti `npm test`.
- [ ] Pokrenuti `npm run build`.
- [ ] Pokrenuti `npm run test:security`.
- [ ] Pokrenuti `npm run security:scan`.
- [ ] Pokrenuti `npm audit --json` i zapisati odluku za svaki relevantan advisory.
- [ ] Pokrenuti `git diff --check` i Markdown link proveru.
- [ ] Pokrenuti `.githooks/pre-push` pre push-a.
- [ ] Popuniti ograničenja, restart/single-process granicu i fake-vs-live granicu dokaza.
- [ ] Popuniti stvarni doprinos oba člana i proverljivu upotrebu AI-ja.

**Gate V:** sve izvršene komande imaju stvarni exit status; nijedan `NOT RUN` nije predstavljen kao pass.

### Faza D — Demo i završna predaja

- [ ] Uvežbati normalni agentski tok u predviđenom vremenu.
- [ ] Uvežbati browser/API zloupotrebu sa vidljivim nultim provider/tool efektom.
- [ ] Uvežbati agent/tool zloupotrebu sa nepromenjenim stanjem.
- [ ] Pripremiti prikaz tri BEFORE/AFTER scenarija.
- [ ] Pripremiti production header/CSP dokaz.
- [ ] Potvrditi da nastavnik može iz čistog checkpoint-a pokrenuti dokumentovanu security komandu.
- [ ] Završno pregledati da u commitu nema ključa, tokena, privatnih logova ili nepovezanih izmena.

**Gate D — završeno:** igra i W05 agent rade; svi obavezni scenariji imaju dokaz; demo staje u 8 minuta; predaja je ponovljiva.

## 0. Izabrani opseg i odluke pre rada

- Ojačava se postojeći W05 **Shop Strategist** tok `POST /api/games/:gameId/shop-agent`.
- Igra ostaje bez naloga i login ekrana. Server izdaje nepredvidiv, kratkoživeći session scope za browser i interno vezuje svaku partiju za taj scope.
- Session scope nije dokaz stvarnog identiteta osobe. Zato per-session limit mora imati i globalni procesni limit kao zaštitu od brisanja cookie-ja ili pravljenja novih sesija.
- W05 tok ostaje read-only, sa najmanje dva model koraka i jednim stvarnim dozvoljenim tool pozivom. Model nikada ne kupuje perk niti menja partiju.
- Provider, modeli i ključ ostaju isključivo server-side. Ne dodaju se novi provider, proizvoljan model, web/file/shell alat, baza, login platforma ili multiplayer.
- `gameId` je identifikator resursa, a ne pristupni token. Pristup se odlučuje iz pouzdanog serverskog session konteksta.
- Testovi koriste fake provider, sintetički sentinel i lokalni backend. Live provider nije potreban za W08 adversarial suite.

## 1. Checkpoint i početni dokaz

### Uraditi

1. Zabeležiti branch, puni commit SHA, Node/npm verzije i stanje radnog stabla.
2. Zabeležiti igru, izabrani tok, dozvoljene alate i postojeće komande.
3. Sa fake provider-om sačuvati normalan W05 scenario: `get_shop_state → evaluate_perk_plan → final`.
4. Pokrenuti odvojeno `npm run typecheck`, `npm test`, `npm run build`, `npm run security:scan` i `npm audit --json`.
5. Sačuvati stvarni izlaz i exit status. Ne proglašavati proveru uspešnom ako je blokirana okruženjem.

### Trenutno opažanje, 2026-10-28

- Checkpoint je `main` na `973daec6e526c2369347f43a2b68b3f529b8c53d`.
- `npm run typecheck` nije prošao zbog neusklađenog TypeScript okruženja iz nadređenog `node_modules`; zbog `&&` lanca test i build nisu bili pokrenuti u tom pokušaju.
- `npm run security:scan` je prošao.
- `npm audit --json` je završio sa exit kodom 1 i prijavio dva high zbirna nalaza: direktni dev paket Vite `6.4.3` i tranzitivni `source-map-js` `1.2.1`. Pre nadogradnje treba proveriti tačne advisory uslove i regresije; ne koristiti slepo `audit fix --force`.

### Dokazati

- Poznato početno stanje i ponovljiv normalan tok.
- Početni provider/tool brojači i revision pre i posle toka.
- Razlika između greške projekta i blokade lokalnog toolchain-a.

## 2. Specifikacija, invarijante i zamrznuti scenariji

### Uraditi

1. Završiti W08 SpecKit specifikaciju, plan i zadatke pre implementacije.
2. U specifikaciji zadržati svih osam invarijanti I1–I8.
3. Svaku invarijantu povezati sa kontrolom, kodom i najmanje jednim testom.
4. Unapred zamrznuti najmanje tri pre/posle scenarija. Preporuka: tuđi resurs, prekoračen rate/concurrency limit i prompt-injection/zlonameran provider predlog.
5. Unapred popuniti konkretne limite; ne ostavljati „razumno“ ili „dovoljno malo“.

### Kontrolna mapa I1–I8

| Invarijanta | Planirana kontrola | Minimalni dokaz |
|---|---|---|
| I1 | Parsiranje veličine, strict body schema, session/ownership, origin/CSRF i admission limit pre agenta | Odbijen zahtev ima `providerAttempts=0`, `executedToolCalls=0` |
| I2 | Session, owner scope, model chain i limiti nastaju na serveru | Dodati `ownerId`, `role`, `model`, `maxSteps` ne menjaju politiku |
| I3 | Zatvoren tool registry, strict argument schema, autorizovani tool context | Nepoznat/inherited tool i tuđi scope imaju nula izvršenja |
| I4 | Read-only alat i pre/posle snapshot/revision provera | Kanonsko stanje identično pre i posle uspešnog i odbijenog toka |
| I5 | Plain-text render, browser DOM assertion i aktivan CSP | XSS marker nije izvršen i opasan DOM nije nastao |
| I6 | Body/output veličine, per-run budžeti, per-session rate, global concurrency i deadline | Izmereni maksimum ostaje u granici; kapacitet se oslobodi |
| I7 | Minimalan model kontekst, redigovani događaji, sentinel scan | Sentinel nije u bundle-u, response-u, model kontekstu ni logu |
| I8 | Pozitivni W05 scenario posle svake grupe izmena | Najmanje 2 model koraka, 1 dozvoljen alat, validan rezultat |

## 3. Model pretnji i inventar podataka

### Uraditi

1. U `EVIDENCE_W08.md` nacrtati stvarni tok: browser → HTTP admission/auth → agent policy → fake/provider → tool validator → session-scoped podaci → final validator → browser → security događaji.
2. Popisati sva polja koja prelaze granice: session/csrf vrednosti, `gameId`, goal, snapshot/revision, score/XP/perks, recent runs, provider envelope, tool args/results, final result, greške i log metadata.
3. Za svako polje navesti kontrolora, mesto validacije, mesto upotrebe, da li ide modelu i da li se čuva.
4. Posebno označiti `localStorage` best score kao nepouzdan lokalni podatak koji ne daje prava i ne ide modelu.
5. Dokumentovati šest stvarnih rizika i tri prioriteta iz [audita](04-Audit-sest-nepravilnosti.md).

### Proveriti

- `gameId` nigde nije tretiran kao dovoljan dokaz vlasništva.
- Model ne dobija session/csrf vrednosti, game ID, ključ, kompletan snapshot ili podatke druge partije.
- Tool context nastaje iz već autorizovanog serverskog konteksta, ne iz model argumenata.

## 4. HTTP ulaz, session scope i integritet igre

### Uraditi

1. Izdati session cookie sa `HttpOnly`, `SameSite=Strict`, odgovarajućim `Secure` ponašanjem i ograničenim trajanjem; browser ne bira scope ID.
2. Za state-changing i AI POST zahteve proveravati session, vlasništvo resursa, dozvoljeni origin i CSRF vrednost pre provider/tool rada.
3. WebSocket upgrade mora primeniti isti session/ownership check i origin politiku.
4. Zahtevati tačan JSON content type za JSON rute i zadržati stream limit pre `JSON.parse`.
5. Za privatne resurse koristiti stabilnu politiku odgovora koja nepotrebno ne otkriva da li tuđa partija postoji.
6. Napraviti sintetičke kontekste A i B kroz test adapter koji nije dostupan u normalnom runtime-u.

### Proveriti

- A čita/menja/analizira samo A resurse; A ne može B resurs preko GET, POST, WebSocket ili tool toka.
- Nedostajući, pogrešan i istekao session/csrf kontekst se odbija pre provider-a.
- Cross-origin zahtev ne izaziva AI trošak čak i kada zna `gameId`.
- Izmenjeni localStorage score ne menja server score, ovlašćenja, limite ili model kontekst.

## 5. Runtime JSON ugovori i agentska izvršna politika

### Uraditi

1. Zadržati strict exact-key validaciju HTTP goal-a, model envelope-a, tool argumenata, tool rezultata i finalnog odgovora.
2. Eksplicitno testirati nepoznata polja, `null`, niz umesto objekta, nedostajuća polja, pogrešne brojeve, `constructor`, `toString` i `__proto__`.
3. Ne oslanjati se na prompt da zabrani alat. Fake provider mora namerno vratiti nedozvoljeni tool predlog.
4. Validirati da je finalni `finding` kanonski izveden iz konkretnog tool rezultata ili ga server sam generiše iz strukturiranih činjenica; samo tačan `source`/`step` nije dovoljan dokaz istinitosti teksta.
5. Normalizovati/odbiti bidi i C1 kontrolne znakove prema dokumentovanoj plain-text politici.
6. Zadržati ograničenje provider response-a, model teksta, tool rezultata i finalnog odgovora.

### Proveriti

- Prompt injection u stvarnom dostupnom kanalu ne menja allowlist, owner scope, limite ili stanje.
- Pošto trenutni proizvod ne prihvata slobodan korisnički goal niti tekst u stvarnim tool rezultatima, obavezni test koristi zlonameran provider odgovor; ta granica se izričito navodi.
- Nevalidan tool rezultat nikada ne ulazi u sledeći model kontekst.
- Nevalidan final nije prikazan kao uspeh.

## 6. Budžeti, deadline, rate i konkurentnost

### Planirani početni lokalni profil

| Granica | Početna vrednost za specifikaciju |
|---|---:|
| HTTP telo / goal | 16 KiB / fiksni enum bez slobodnog teksta |
| Provider response / model tekst | 16 KiB / 4.096 karaktera |
| Tool rezultat | 4 KiB |
| Model koraci / tool pozivi | 5 / 4 po run-u |
| Provider pokušaji | Najviše 8 po run-u, uključujući fallback |
| Jedan poziv / ukupan deadline | 10 s / 45 s |
| Globalno aktivni agent run-ovi | 2 po procesu |
| Aktivni run po session scope-u | 1 |
| Novi agent run-ovi po session scope-u | 5 u kliznih 60 s |
| Novi agent run-ovi globalno | 20 u kliznih 60 s |
| Aktivne partije po session scope-u | 3 |
| Ukupne in-memory partije | 100, uz dokumentovano uklanjanje neaktivnih |

Vrednosti su plan, ne trenutna činjenica. Pre implementacije ih treba potvrditi u specifikaciji i testovima.

### Proveriti

- Višak se odbija sa stabilnim kodom i `429` pre provider rada.
- Dve dozvoljene paralelne operacije rade; treća je odbijena; stvarni maksimum aktivnih poslova nikad ne prelazi 2.
- Posle završetka, abort-a ili deadline-a slot se oslobodi i sledeći legitiman zahtev uspeva.
- Novi game/session ne resetuje globalnu granicu.
- Zakašnjeli provider rezultat ne postaje success i ne oslobađa slot dok pozadinski posao stvarno nije završen ili kontrolisano prekinut.

## 7. Browser prikaz i production profil

### Uraditi

1. Zadržati model tekst u `textContent`; ne uvoditi HTML/Markdown renderer radi zadatka.
2. Dodati realan browser test za finalni model tekst i drugi stvarni nepouzdan prikaz.
3. Production preview mora slati aktivan CSP prilagođen postojećem bundle-u, `X-Content-Type-Options: nosniff` i eksplicitni `Referrer-Policy`.
4. CSP treba najmanje da zabrani plug-in objekte, base preusmeravanje i framing; script/connect izvori moraju biti minimalni za lokalni profil.
5. Kontrolisano učitati resurs koji bi bez CSP-a bio dostupan i dokazati da ga je konkretna direktiva blokirala.

### Proveriti

- XSS marker ostaje tekst ili je odbačen; nema `img/script` čvora niti event handler atributa.
- Normalan tekst, srpska slova, apostrof i `a < b` ostaju čitljivi.
- Production build, igra, WebSocket, shop i fake agent rade pod CSP-om.
- Sentinel nije u `dist/` ni source map fajlovima ako se generišu.

## 8. Tajne, logovi, state i dependency pregled

### Uraditi

1. Koristiti samo sintetički sentinel `W08_SERVER_SECRET_DO_NOT_EXPOSE`; ne čitati secret fajlove.
2. Uvesti mali allowlist security događaja za accepted/rejected admission, access deny, rate/concurrency deny, tool reject i run completion.
3. Server generiše correlation ID. Ne logovati raw prompt, goal tekst, game ID, session/csrf token, cookie, provider body, tool rezultat, stack trace ili ključ.
4. Sanitizovati reason kodove i ne kopirati nepoznat tool name ili tekst sa newline-om u log polja.
5. Dokumentovati da su game state, rate prozori, istorija i concurrency brojači process-local i gube se restartom; to je prihvatljivo za lokalni W08 profil, ali nije dokaz za više procesa ili produkciju.
6. Za svaki dependency advisory navesti paket/verziju, runtime ili dev upotrebu, uslov izloženosti i odluku sa dokazom.

### Proveriti

- Sentinel je server učitao, ali se ne pojavljuje u klijentu, response-u, model kontekstu ili logu.
- Newline/log-forging fixture proizvodi tačno jedan validan JSON događaj bez lažnog reda.
- Rani HTTP reject i rate/access deny imaju događaj, a `providerAttempts=0` i `toolCalls=0`.
- Nadogradnja zavisnosti, ako se prihvati, prolazi pune regresione provere; bez `--force` slepog menjanja.

## 9. Obavezna test matrica i mesto dokaza

Planirana lokacija je početna podela odgovornosti; `tasks.md` je mora potvrditi pre implementacije. T00–T15 i T17 su obavezno automatizovani. T04/T05 koriste stvarni browser. T16 sme da kombinuje automatizaciju i precizno dokumentovan ručni smoke.

| ID | Šta mora stvarno stići do kontrole | Ključna tvrdnja | Tip | Planirana lokacija |
|---|---|---|---|---|
| T00 | Normalna partija i fake W05 agent | ≥2 model koraka, ≥1 tool, bez mutacije | Integration | `tests/agentHttp.test.ts`, security suite |
| T01 | Malformed/wrong-type/domain JSON | 400; nula provider/tool poziva; validna granica prolazi | Integration | `tests/httpServer.test.ts` |
| T02 | Preveliko telo i privilegovana polja | 413/400; server policy nepromenjena | Integration | `tests/httpServer.test.ts` |
| T03 | A traži B resurs preko API-ja i tool toka | Odbijeno pre provider-a, bez curenja sadržaja | Integration | `tests/sessionSecurity.test.ts`, `tests/agentHttp.test.ts` |
| T04 | XSS marker kroz finalni model tekst | Bez izvršenja i bez opasnog DOM-a | Browser | `scripts/e2e/secureArcade.e2e.ts` |
| T05 | HTML/URL marker | Tekst/odbijanje; bez aktivne navigacije | Browser | `scripts/e2e/secureArcade.e2e.ts` |
| T06 | Nevalidan/prevelik provider izlaz | Kontrolisana greška; nema success prikaza | Unit + integration | `tests/agentGoogleTransport.test.ts`, `tests/agentOrchestrator.test.ts` |
| T07 | Nepoznat, `constructor`, `toString` alat | Nula izvršenja i efekata | Unit + integration | `tests/agentTools.test.ts`, `tests/agentOrchestrator.test.ts` |
| T08 | Dozvoljen alat, validna schema, pogrešan scope | Autorizacija ga odbija pre čitanja | Integration | `tests/agentHttp.test.ts` |
| T09 | Injection tekst + namerno zabranjen provider predlog | Izvršna politika, ne prompt, zaustavlja predlog | Integration | `tests/agentOrchestrator.test.ts`, `tests/agentHttp.test.ts` |
| T10 | Nevalidan/prevelik tool rezultat sa sentinelom | Ne ulazi u sledeći model poziv | Unit + integration | `tests/agentTools.test.ts`, `tests/agentOrchestrator.test.ts` |
| T11 | Ponovljen alat i iscrpljen shared budget | Nema poziva preko granice | Unit | `tests/agentOrchestrator.test.ts` |
| T12 | Per-call timeout, total deadline, zakasneli rezultat | Nema kasnog success-a; cleanup potvrđen | Unit + integration | `tests/agentReliability.test.ts`, `tests/resourceGovernor.test.ts` |
| T13 | Paralelni zahtevi i rate window | Aktivni maksimum i 429 su serverski sprovedeni | Integration | `tests/resourceGovernor.test.ts`, `tests/agentHttp.test.ts` |
| T14 | Tajna u grešci/tool polju i log forging | Nema curenja ni lažnog događaja | Unit + integration | `tests/securityEvents.test.ts`, security suite |
| T15 | Izmenjen localStorage/client state | Ne daje prava niti potvrđen server rezultat | Browser + integration | `scripts/e2e/secureArcade.e2e.ts`, `tests/agentHttp.test.ts` |
| T16 | Lokalni production build | Zaglavlja rade, CSP blokira kontrolu, legitiman tok radi | Browser + documented smoke | `scripts/e2e/secureArcade.e2e.ts`, `EVIDENCE_W08.md` |
| T17 | Brisanje session cookie-ja i novi game ID tokom rate prozora | Globalni backstop i session cap sprečavaju reset zloupotrebe | Integration | `tests/resourceGovernor.test.ts`, `tests/sessionSecurity.test.ts` |
| CSRF | Drugi lokalni origin, automatski cookie, bez validnog tokena | Nema mutacije ni provider troška | Browser + integration | `scripts/e2e/secureArcade.e2e.ts`, `tests/httpServer.test.ts` |

## 10. Obavezni artefakti i ponovljive komande

### `tasks.md`

Mora biti dependency-ordered i test-first. Minimalne grupe:

1. Dokumentacija/evidence freeze.
2. Baseline/toolchain.
3. Session i ownership testovi, pa implementacija.
4. Resource governor testovi, pa implementacija.
5. Tool normalization i grounded-final testovi, pa implementacija.
6. Security events i browser/CSP testovi, pa implementacija.
7. T00–T17/CSRF konsolidacija, full regression i evidence.
8. Demo i delivery provera.

Svaki task navodi konkretne fajlove, zavisnosti, očekivani RED/GREEN dokaz i W08 scenario ID.

### `EVIDENCE_W08.md`

Skeleton se pravi pre implementacije i mora sadržati:

- checkpoint, okruženje i stvarne komande;
- Mermaid dijagram i trust boundary-je;
- data-flow inventar;
- šest rizika i tri prioriteta, uz link na detaljni audit;
- I1–I8 mapu na kod i testove;
- tabelu konkretnih limita;
- T00–T17 i CSRF: fixture, očekivanje, observed rezultat, brojače i lokaciju testa;
- tri zamrznuta BEFORE/AFTER poređenja;
- typecheck/test/build/browser/sentinel/security scan/dependency rezultate;
- redigovan primer security događaja;
- ograničenja i ono što fake test ne dokazuje;
- stvarni doprinos oba člana i proverenu upotrebu AI-ja.

### Jedna security komanda

Do završetka mora postojati dokumentovana offline komanda:

```sh
npm run test:security
```

Ona ne sme zahtevati pravi provider ključ i mora pokrenuti W08 unit/integration scenarije i built-preview browser test ili mali jasno dokumentovan sled komandi ako jedan runner tehnički nije pouzdan. Nastavnik mora moći da je ponovi iz čistog checkpoint-a.

## 11. Demo plan — najviše 8 minuta

| Vreme | Prikaz | Dokaz koji mora biti spreman |
|---|---|---|
| 0:00–1:00 | Igra, izabrani W05 tok i najveći rizik | Kratka arhitektura i objašnjenje da `gameId` nije ovlašćenje |
| 1:00–2:30 | Normalan fake agentski tok | ≥2 model koraka, ≥1 dozvoljen tool, validan grounded final, stanje nepromenjeno |
| 2:30–3:45 | Browser/API zloupotreba | A traži B resurs ili cross-origin zahtev; provider/tool brojači ostaju 0 |
| 3:45–5:00 | Agent/tool zloupotreba | Injection ili unknown/write tool; alat nije izvršen, stanje isto |
| 5:00–6:00 | Rate/concurrency dokaz | Izmereni aktivni maksimum, 429/deny i uspeh narednog legitimnog zahteva |
| 6:00–7:00 | Tri BEFORE/AFTER poređenja | T03, T13 i T09/T10 sa istim fixture-ima |
| 7:00–7:40 | Production build zaštita | CSP/security header-i, blokiran stvarno dostupan resurs, inertan DOM |
| 7:40–8:00 | Ograničenja i reprodukcija | `npm run test:security`, single-process/no-login/fake-provider granice |

Pre demonstracije oba člana moraju umeti da objasne gde se donosi odluka, koji efekat je zabranjen i koji test to dokazuje.

## 12. Prvi sledeći korak

Prvi naredni radni korak je **P1.5 — napraviti skeleton `EVIDENCE_W08.md` i zamrznuti očekivanja pre bilo kakve aplikacione izmene**:

1. Kreirati evidence iz projektnog template-a.
2. Upisati code checkpoint `973daec6e526c2369347f43a2b68b3f529b8c53d` i trenutno poznatu toolchain blokadu.
3. Dodati Mermaid dijagram i data-flow inventar.
4. Preneti šest rizika/tri prioriteta linkovanjem, bez dupliranja celog audita.
5. Unapred popuniti expected kolone za T00–T17/CSRF i tri BEFORE/AFTER scenarija; observed ostaviti `NOT RUN`.

Tek zatim zatvaramo preostalu normativnu I1–I8 sekciju u `spec.md`, generišemo `tasks.md`, popravljamo lokalni dependency setup i snimamo baseline. Implementacija počinje tek posle **Gate P** i **Gate B**.

## Definition of Done

- Normalna igra i W05 tok ostaju funkcionalni.
- Nijedan početno odbijen zahtev ne pokreće provider ili tool.
- Session A ne može da čita, menja, sluša ili analizira session B resurse.
- Direktan/cross-origin zahtev bez validnog serverskog konteksta ne troši AI budžet.
- Per-session i globalni limiti imaju izvršiv pozitivan i negativan dokaz.
- Zlonameran model/tool rezultat ne proširuje allowlist, scope ili limite i ne menja stanje.
- Nepouzdan tekst ostaje inertan u stvarnom browseru pod aktivnim CSP-om.
- Tajna nije u klijentu, model kontekstu, response-u ili operativnom logu.
- Svi rezultati u evidenciji odgovaraju stvarno pokrenutim proverama, sa iskreno navedenim blokadama.
