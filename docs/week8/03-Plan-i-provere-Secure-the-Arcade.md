# W08 Secure the Arcade — plan rada i provera po sekcijama

Ovaj dokument prevodi [W08 zadatak](02-Nedeljni-zadatak-Secure-the-Arcade.md) u redosled rada prilagođen RETRO SNAKE projektu. Ne predstavlja dokaz da je zaštita implementirana. Stvarni rezultati, izlazi komandi i ograničenja beleže se u [EVIDENCE_W08.md](EVIDENCE_W08.md) tek nakon izvršenja.

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
- [x] Potvrđeno: per-session limiti se vezuju za server scope koji identifikuje HttpOnly cookie (anonimna browser sesija, ne potvrđena osoba); dodatni fallback je najviše 100 aktivnih scope-ova i 20 uspešnih novih izdanja po procesu u kliznih 60 s. Usklađeno kroz spec, data model, ugovor, plan, tasks, audit i evidence.
- [x] Verifier se čuva samo u `sessionStorage` trenutnog taba: opstaje kroz reload, briše se zatvaranjem taba; ne koristi se `localStorage` niti URL.
- [x] Dodata normativna sekcija I1–I8 u `specs/004-secure-agent-boundaries/spec.md`.
- [x] Napravljen `specs/004-secure-agent-boundaries/tasks.md` sa dependency redosledom i test-first zadacima.
- [x] Napravljen je [skeleton `EVIDENCE_W08.md`](EVIDENCE_W08.md) pre promene koda; rezultati ostaju `NOT RUN` dok se stvarno ne izvrše.
- [x] U evidence-u su dodati postojeća i ciljna Mermaid arhitektura sa trust boundary-jima.
- [x] U evidence-u je dodat data-flow inventar: kontrolor, validacija, upotreba, model, čuvanje.
- [x] Zamrznuta su očekivanja za T00–T17 i CSRF pre implementacije.
- [x] Zamrznuta su tri BEFORE/AFTER scenarija: T03, T13 i T09/T10; stvarni BEFORE probe-ovi su zabeleženi, AFTER ostaje pending.
- [x] Dodat je versioned implementation prompt za tri prioriteta: `docs/prompts/week8/BUILD_PROMPT_SECURE_AGENT_BOUNDARIES_V1.md`.
- [x] Svaki T scenario povezati sa fixture-om, test-fajlom, tipom testa i ponovljivom komandom u `EVIDENCE_W08.md`.
- [x] Pripremiti osmomimutni scenario; koraci i fixture komande su u [05-Demo-vodic-Secure-the-Arcade.md](05-Demo-vodic-Secure-the-Arcade.md). Ljudska proba ostaje poseban završni korak.

**Gate P — planiranje završeno:** sve stavke P1 su `[x]`; specifikacija, plan, tasks i evidence skeleton se međusobno ne sukobljavaju.

### Faza B — Baseline pre implementacije

- [x] Popravljen je lokalni dependency/toolchain setup korišćenjem `npm ci` iz lockfile-a; manifest/lockfile nisu menjani.
- [x] Zabeleženi su branch `main`, puni code/evidence SHA, Node/npm verzije i dokumentaciono stanje worktree-a.
- [x] Pokrenut i sačuvan zaseban izlaz `npm run typecheck` (exit 0).
- [x] Pokrenut i sačuvan zaseban izlaz `npm test` (119/119).
- [x] Pokrenut i sačuvan zaseban izlaz `npm run build` (exit 0).
- [x] Pokrenut je početni `npm run security:scan`; rezultat je uspešan.
- [x] Pokrenut je početni `npm audit --json`; dva high zbirna nalaza su dokumentovana.
- [x] Pokrenut normalni W05 fake tok i sačuvano: 3 model koraka, 2 dozvoljena tool poziva i validan final.
- [x] Sačuvana je testirana before/after revision jednakost i provider/tool rezultat za W05 baseline; test ne proverava full snapshot deep equality.
- [x] Pokrenuti tri zamrznuta BEFORE scenarija T03, T13 i T09/T10; stvarni rezultati i postojeće zaštite zabeleženi u `EVIDENCE_W08.md`.

**Gate B — baseline sačuvan:** code baseline i T03/T13/T09/T10 pre-rezultati su zabeleženi pre prve aplikacione izmene. Puni Gate D/W08 closeout ostaje za kasnije.

### Faza I1 — Session, ownership i request provenance

- [x] Napisati failing testove za session bootstrap, expiry, verifier, media type i origin.
- [x] Napisati A/B testove za GET, mutacije, oba AI toka i WebSocket.
- [x] Implementirati server-issued session scope koji nije vidljiv modelu ili tool argumentima.
- [x] Vezati svaku partiju za interni owner scope; `gameId` ostaje samo identifikator.
- [x] Enforcovati ownership pre čitanja, mutacije, provider-a i tool-a.
- [x] Enforcovati CSRF/request verifier i tačan Origin; Playwright potvrđuje same-site/different-origin cookie form request dobija 403 bez provider/run side-effect-a.
- [x] Enforcovati isti session/ownership/origin kontekst na WebSocket upgrade-u.
- [x] Enforcovati `application/json`, pre-parse body limit i exact-key schema.
- [x] Potvrditi: svaki early reject ima `providerAttempts=0`, `toolCalls=0` i bez promene stanja za pokrivene admission slučajeve.
- [x] Potvrditi: pozitivni A→A i normalni W05 tok i dalje rade.

**Gate I1:** T01, T02, T03, T08, T15 i CSRF imaju negativnu i pozitivnu kontrolu.

### Faza I2 — Rate, concurrency, lifecycle i deadline

- [x] Napisati failing testove sa fake clock-om i deferred provider-om.
- [x] Implementirati jedan zajednički in-memory resource governor.
- [x] Enforcovati 1 aktivan agent run po session scope-u i 2 globalno.
- [x] Enforcovati 5 prihvatanja/60 s po session scope-u i 20/60 s globalno.
- [x] Enforcovati 3 aktivne partije po scope-u i 100 globalno.
- [x] Enforcovati subscription limite i idempotent lease release.
- [x] Implementirati idle cleanup bez izbacivanja aktivnog/pinovanog resursa.
- [x] Pratiti raw provider posao koji ignoriše abort; kasni rezultat ne sme postati success.
- [x] Potvrditi oslobađanje kapaciteta posle success/failure/cancel/deadline-a.
- [x] Potvrditi da novi game/session ne resetuje globalni backstop.

**Gate I2:** T11, T12, T13 i T17 prolaze; izmereni maksimum nikada ne prelazi politiku.

### Faza I3 — Agent/tool/final assurance

- [x] Napisati failing/negative tests za raw/oversized/additional/secret-bearing tool rezultate.
- [x] Parsirati tool rezultat u novi normalizovani DTO pre model transcript-a.
- [x] Zadržati zatvoren registry i odbiti unknown, inherited i nepostojeće write/network/file/shell alate.
- [x] Uvesti structured evidence fact reference umesto slobodne modelske činjenične rečenice.
- [x] Generisati prikaz evidence-a iz validiranih serverskih činjenica.
- [x] Centralizovati plain-text politiku za C0/C1, bidi i zero-width; HTML/Markdown/URL ostaju inertan podatak jer se modelov proizvoljan tekst ne prikazuje, a UI koristi `textContent`.
- [x] Provesti malicious forbidden-tool predlog kroz HTTP→agent policy (T09) i malicious provider final kroz browser journey (T04/T05).
- [x] Potvrditi da fixture injection ne menja allowlist, budžet ili kanonsko stanje; fake provider dokazuje izvršnu politiku, ne live-model otpornost.
- [x] Potvrditi da validan strukturirani plan i dalje prolazi.

**Gate I3:** T06, T07, T09 i T10 prolaze sa eksplicitnim provider/tool/state brojačima.

### Faza I4 — Security events, browser i production profil

- [ ] Napisati jedan exact-schema test/event union za sve admission/access/limit/tool/provider/run događaje sa bounded aggregate counters. Postoje HTTP denial schema testovi i odvojena agent telemetry, ali nisu objedinjeni.
- [x] Implementirati server-generated correlation ID i enumerisane reason kodove za HTTP denials.
- [x] Potvrditi kroz telemetry i browser log capture da testirani logovi ne sadrže session cookie/verifier, provider prompt/result sentinel, stack ili tajnu.
- [x] Potvrditi da HTTP newline/log-forging fixture pravi samo jedan safe JSON denial događaj; ostaje objedinjavanje svih agent event tipova.
- [x] Dodati CSP, `nosniff` i `no-referrer` na lokalni production preview; HTTP header smoke je prošao.
- [x] Dodati Playwright test stvarnog DOM-a za T04/T05; pozitivne srpske/`a < b` kontrole su u final validation testovima.
- [x] Dokazati CSP blokadu kontrolisanog resursa koji nezavisno vraća HTTP 200.
- [x] Potvrditi production igra, WebSocket i W05 fake agent pod aktivnim CSP-om.
- [x] Proveriti sintetički sentinel u svim testiranim bundle/response/model-transcript/log kanalima; source map se ne generiše u ovom production buildu. Ovo nije opšti DLP dokaz.

**Gate I4:** T04/T05/T16 i HTTP newline-log-forging deo T14 imaju stvarni browser/production dokaz. HTTP, provider-attempt, tool-rejection i završetak agent run-a dele `w08_security_event` šemu sa correlation ID-em i ograničenim brojačima.

### Faza V — Kompletna verifikacija i evidence

- [x] Dodati ponovljivu offline komandu `npm run test:security` za unit/integration, production build i Chromium/Playwright browser suite.
- [x] Automatizovati T00–T15 i T17; T04/T05 koriste stvarni browser. T14 proverava jednu zajedničku, allowlistovanu event šemu sa ograničenim brojačima.
- [x] Dokumentovati T16 automated browser proof; manual instructor replay command is in the demo guide.
- [x] Ponovo pokrenuti ista tri AFTER scenarija i uporediti ih sa BEFORE rezultatima; T00/T03/T13/T09/T10 automatizovani AFTER dokazi su evidentirani.
- [x] Popuniti observed rezultate, brojače i lokacije za T00–T17 i CSRF u `EVIDENCE_W08.md`.
- [x] Pokrenuti `npm run typecheck`.
- [x] Pokrenuti `npm test`.
- [x] Pokrenuti `npm run build`.
- [x] Pokrenuti `npm run test:security`.
- [x] Pokrenuti `npm run security:scan`.
- [x] Pokrenuti `git diff --check`.
- [x] Ponovo pokrenuti `npm audit`; kompatibilni patch upgrade je eliminisao trenutno prijavljene nalaze.
- [x] Pokrenuti `git diff --check` i Markdown local-link proveru nakon finalnog doc patch-a; lokalni link sken preskače namerni `javascript:` napadački literal u test fixture-u.
- [ ] Pokrenuti `.githooks/pre-push` neposredno pre eventualnog push-a (push trenutno nije tražen).
- [x] Popuniti ograničenja: restart/single-process, anonimna sesija, dekorativni localStorage score i fake-vs-live granica.
- [ ] Popuniti stvarni doprinos oba člana i proverljivu upotrebu AI-ja.

**Gate V:** build/test/browser/audit/security scan prolaze i svi T redovi imaju observed zapis; pre komita ostaje završni Markdown/diff review i replay komanda.

### Faza D — Demo i završna predaja

- [ ] Uvežbati normalni agentski tok u predviđenom vremenu.
- [ ] Uvežbati browser/API zloupotrebu sa vidljivim nultim provider/tool efektom.
- [ ] Uvežbati agent/tool zloupotrebu sa nepromenjenim stanjem.
- [x] Pripremiti prikaz tri BEFORE/AFTER scenarija u demo vodiču.
- [x] Pripremiti production header/CSP dokaz preko Playwright-a i response assertions.
- [x] Navesti nastavniku ponovljive komande i Chromium prerequisite u demo vodiču; proveriti nakon commit-a kroz clean worktree nije urađeno.
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
| Aktivni session zapisi po procesu | 100 |
| Uspešna nova session izdanja po procesu | 20 u kliznih 60 s |
| WebSocket pretplate po partiji | 1 |
| WebSocket pretplate po session scope-u / procesu | 3 / 100 |

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

## 12. Sledeći korak

Priprema i tri ciljna BEFORE proba su urađeni. Sledeće je **T005–T008 — foundational test/evidence helpers**, a zatim **T009–T021 — Priority 1 session/ownership**, test-first.

1. Uvesti test clock/provider/assertion helper-e i dogovorene limit konstante bez aplikacionih kontrola još.
2. Dodati failing session bootstrap, cookie/verifier, expiry i T03 A/B API/WS testove; verifier ide u tab-scoped `sessionStorage`.
3. Implementirati session scope, ownership i admission u HTTP/WS/agent tokovima.
4. Ponoviti T03 AFTER i W05 normalni fake tok; proveriti 0 provider/tool poziva za rani reject i nepromenjeno B stanje.
5. Nastaviti Priority 2 pa Priority 3, čuvajući T13 i T09/T10 BEFORE poređenja.

Posle tri story gate-a stajemo: dependency odluka, kompletan T00–T17/CSRF closeout, demo i konačna predaja ostaju za kasnije.

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
