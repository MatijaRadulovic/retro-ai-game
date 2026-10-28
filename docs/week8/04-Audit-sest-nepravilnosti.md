# W08 audit — šest konkretnih nepravilnosti u trenutnom projektu

**Datum pregleda:** 2026-10-28
**Checkpoint:** `main`, `973daec6e526c2369347f43a2b68b3f529b8c53d`
**Izabrani tok:** W05 Shop Strategist, `POST /api/games/:gameId/shop-agent`

Ovo je code-review i threat-model nalaz, ne penetration test i ne tvrdnja da su popravke implementirane. Secret fajlovi nisu otvarani. Live provider nije pozvan.

## Sažetak postojećih dobrih kontrola

Preostalih šest rizika ne poništavaju zaštite koje već postoje:

- HTTP body se stream-uje uz limit od 16 KiB pre `JSON.parse`, a agent goal zahteva exact-key objekat ([`server/httpServer.ts`](../../server/httpServer.ts)).
- Browser ne bira provider/model ili limite. Model chain je serverski allowlist.
- Tool registry je zatvoren; `constructor`/`toString` ne prolaze; argumenti i rezultati imaju runtime validaciju ([`server/agent/tools.ts`](../../server/agent/tools.ts)).
- Agent ima step/tool/provider/deadline limite, repeat detection i abort signal ([`server/agent/orchestrator.ts`](../../server/agent/orchestrator.ts)).
- Plan mora odgovarati planu koji je evaluator prihvatio; revision/status se ponovo proveravaju pre uspeha.
- Model tekst se prikazuje sa `textContent`, ne kao HTML ([`src/main.ts`](../../src/main.ts)).
- Provider odgovor i model tekst imaju veličinske granice; ključ se šalje samo server-side provider header-om.

## Prioriteti

| Prioritet | Nalaz | Zašto prvo |
|---|---|---|
| P1 | R1 + R3: nema session vlasništva ni pouzdanog request konteksta | Poznavanje `gameId` trenutno je dovoljno za čitanje, mutaciju, WebSocket i AI trošak |
| P2 | R2: nema per-session/globalnog admission limita | Omogućava paralelno trošenje provider kvote i neograničen rast memorije |
| P3 | R5: finalne AI tvrdnje nisu vezane za kanonske tool činjenice i injection dokaz nije end-to-end | Izvršni allowlist je dobar, ali prikazan „evidence“ može biti izmišljen, a W08 dokaz ne pokriva stvarni lanac |

R4 i R6 su obavezni W08 hardening/evidence rad, ali ne smeju zameniti prva tri izvršna prioriteta.

## R1 — `gameId` praktično daje pristup tuđoj partiji

**Kategorija:** API/podaci; broken object-level authorization
**Pogođene invarijante:** I1, I2, I3, I7
**W08 scenariji:** T03, T08, T15

- **Scenario:** Klijent A sazna ili dobije `gameId` klijenta B i direktno pozove GET snapshot, move/pause/resume/restart/perks, Shop Advisor, Shop Strategist ili WebSocket events za B. Server proverava samo da partija postoji i da joj status odgovara akciji.
- **Preduslov:** Napadač zna `gameId`. UUID smanjuje slučajno pogađanje, ali ne predstavlja autorizaciju; može procureti kroz browser istoriju, screenshot, log, dodatak ili drugi kanal.
- **Pogođen resurs:** Kanonsko stanje i istorija partije, shop podaci, provider kvota i privatnost jednog game container-a.
- **Verovatnoća:** Srednja u lokalnom demo profilu; visoka ako se servis izloži ili ID procure. Nepredvidivost identifikatora nije kontrola vlasništva.
- **Uticaj:** Visok. Mogući su čitanje snapshot-a i history-derived AI rezultata, menjanje partije i pokretanje plaćenog/spoljnog AI rada.
- **Dokaz u kodu:** Sve rute izvlače samo `path[2]` i pozivaju `manager.get(gameId)` ili mutaciju bez owner/session argumenta (`server/httpServer.ts:80-151`). WebSocket upgrade takođe radi samo `manager.get(gameId)` (`server/httpServer.ts:174-199`). `Session` nema owner scope (`server/gameSession.ts:18-29`).
- **Postojeća kontrola:** Nasumični UUID i izolovani `Map` container-i. To sprečava kolizije i slučajno mešanje, ali ne dokazuje pravo pristupa.
- **Planirana kontrola:** Server-issued opaque session scope; interno `ownerScopeId` na svakoj partiji; centralni authorization pre handler-a i pre agent/tool konteksta; isti check na WebSocket-u. Cookie/token se nikad ne šalje modelu niti loguje.
- **Planirani dokaz:** Test adapter stvara A/B scope. A uspeva nad A; A dobija isti bezbedan deny za B/nonexistent resurs preko GET, mutacije, WebSocket i agent rute. Za odbijeni agent zahtev: `providerAttempts=0`, `toolCalls=0`, B snapshot/history nepromenjeni.

## R2 — Per-game `inFlight` nije rate limit; AI i session memorija su neograničeni između resursa

**Kategorija:** Potrošnja resursa
**Pogođene invarijante:** I1, I6, I8
**W08 scenariji:** T13, T17

- **Scenario:** Napadač pravi mnogo partija kroz javni `POST /api/games`, pauzira svaku i paralelno poziva Shop Strategist. `inFlight` blokira drugi run samo za isti `gameId`, pa svaki novi ID dobija sopstveni provider run. Session `Map`, timeri/listeneri i istorije nemaju maksimalan broj ni idle cleanup.
- **Preduslov:** Mrežni pristup lokalnom backend-u/proxy-ju; nisu potrebni ključ, login ili browser UI.
- **Pogođen resurs:** Gemini kvota/trošak, event loop, memorija, WebSocket konekcije i dostupnost igre legitimnom korisniku.
- **Verovatnoća:** Visoka čim endpoint može da se pozove direktno; automatizacija je trivijalna.
- **Uticaj:** Visok. Jedan run može imati do 8 provider pokušaja i 45 s, a broj paralelnih run-ova nije globalno ograničen.
- **Dokaz u kodu:** `inFlight` je `Set<gameId>` (`server/agent/shopAgent.ts:29-42`). `GameSessionManager.sessions` je neograničen `Map`, a `create()` uvek dodaje novu sesiju (`server/gameSession.ts:54-78`). Ne postoji 429, sliding window, semaphore ili globalni active-run brojač.
- **Postojeća kontrola:** Per-run step/tool/provider/deadline budžeti i jedan aktivan run po game ID-ju. Oni ograničavaju pojedinačan run, ne zbir između HTTP zahteva.
- **Planirana kontrola:** Jedan aktivan run po session scope-u, najviše 5 prihvatanja/60 s po scope-u, globalno najviše 20/60 s i 2 aktivna run-a po procesu; ograničenje partija po scope-u i ukupno, idle cleanup i limit WebSocket konekcija. Sve vrednosti su server config sa validiranim bezbednim opsegom.
- **Planirani dokaz:** Fake clock i odloženi provider. Izmeriti aktivni maksimum 2; treći zahtev dobija 429 pre provider-a; novi game ID ne resetuje globalni prozor; slot se oslobađa posle success/cancel/deadline-a; sledeći legitiman zahtev uspeva.

## R3 — Server ne utvrđuje poreklo zahteva i prihvata JSON bez provere content type-a

**Kategorija:** Browser/API; request provenance, CORS/CSRF
**Pogođene invarijante:** I1, I2, I6
**W08 scenariji:** T01, T02, T13 i dodatni CSRF scenario

- **Scenario:** Direktni HTTP klijent ili drugi origin šalje telo koje server parsira kao JSON bez provere `Content-Type`, `Origin` ili `Sec-Fetch-Site`. Ako zna `gameId`, može da pokrene agent ili mutaciju mimo UI-ja. WebSocket handshake nema origin check.
- **Preduslov:** Pristup backend-u i poznat game ID. Za browser cross-site varijantu potreban je način da se pošalje dozvoljeni simple request ili otvori WebSocket; trenutni server ne donosi serversku odluku na osnovu origin-a.
- **Pogođen resurs:** Igra, provider kvota i session podaci.
- **Verovatnoća:** Srednja lokalno, visoka ako se backend proksira/objavi bez dodatne kontrole.
- **Uticaj:** Visok u kombinaciji sa R1/R2.
- **Dokaz u kodu:** `readJson()` čita i parsira telo bez provere header-a (`server/httpServer.ts:31-45`). Handler nema origin/CSRF/session middleware. WebSocket upgrade prihvata URL/game ID bez origin provere (`server/httpServer.ts:174-192`). Vite proxy menja origin prema backend-u (`vite.config.ts:6-11`), ali proxy nije autentikacija.
- **Postojeća kontrola:** Node server se u `server/index.ts` vezuje za `127.0.0.1`, a browser koristi same-origin Vite proxy. Browser CORS može blokirati čitanje nekih cross-origin odgovora, ali CORS nije autorizacija niti dokaz da server nije izvršio zahtev.
- **Planirana kontrola:** Centralni admission sloj: tačan media type, dozvoljeni origin za browser rute, HttpOnly SameSite session cookie, CSRF header/token za state-changing/AI POST i isti owner/origin check na WebSocket-u. Non-browser klijent i dalje mora imati validan session capability; origin sam nije dovoljan.
- **Planirani dokaz:** Zahtevi bez/pogrešnim content type-om, sa drugim lokalnim origin-om, bez CSRF-a i bez session-a imaju kontrolisan status i nula provider/tool poziva. Dozvoljeni same-origin zahtev sa validnim kontekstom prolazi.

## R4 — Nema production browser security profila ni stvarnog XSS/CSP dokaza

**Kategorija:** Browser prikaz
**Pogođene invarijante:** I5, I7, I8
**W08 scenariji:** T04, T05, T16

- **Scenario:** Buduća ili postojeća nepouzdana vrednost završi u drugom DOM kontekstu, eksterni script/resource se učita, aplikacija se uokviri ili MIME sniffing/referrer otkrije podatke. Trenutni test potvrđuje validator i nameru `textContent`, ali ne proverava stvarni DOM niti aktivan CSP.
- **Preduslov:** Nepouzdan model tekst ili kompromitovan/neočekivan sadržaj stigne do browsera; ili korisnik otvori lokalni production preview sa resursom koji politika treba da blokira.
- **Pogođen resurs:** Browser session capability, integritet UI-ja i poverljivost prikazanih podataka.
- **Verovatnoća:** Srednja. Trenutna konkretna agent putanja koristi `textContent`, što smanjuje XSS verovatnoću, ali nema defense-in-depth ni browser dokaz.
- **Uticaj:** Visok ako XSS nastane, jer bi mogao da koristi isti origin i session kontekst.
- **Dokaz u kodu:** `vite.config.ts` definiše samo proxy, bez security headers (`vite.config.ts:1-17`). API response ima samo content type i `cache-control` (`server/httpServer.ts:26-28`). Test `tests/shopAgentClient.test.ts` nije browser DOM test; Evidence 014 eksplicitno navodi da Strategist nema browser E2E.
- **Postojeća kontrola:** Agent output se upisuje preko `agentMessage.textContent` (`src/main.ts:471-473`), final tekst odbija C0/DEL kontrolne znakove i klijent validira response shape.
- **Planirana kontrola:** Aktivni CSP za production preview, `nosniff`, `Referrer-Policy`, frame/object/base zabrane; Playwright test stvarne render putanje koji proverava marker i DOM; pozitivna Unicode/`a < b` kontrola.
- **Planirani dokaz:** Header assertions, CSP browser violation za kontrolisani dostupni resurs, marker ostaje inertan bez opasnog čvora/atributa, dok normalna igra/WebSocket/agent i srpski tekst rade.

## R5 — Model može da prikaže izmišljeni evidence tekst; injection test ne dokazuje celu stvarnu putanju

**Kategorija:** Agent/model/tool integritet
**Pogođene invarijante:** I3, I4, I5, I8
**W08 scenariji:** T06, T09, T10

- **Scenario:** Model navede stvarno izvršen `source` i `step`, ali u `finding` upiše tvrdnju koja ne proizlazi iz rezultata, obmanjujući igrača. Model može ubaciti HTML-looking ili bidi/C1 tekst koji ostaje inertan kao HTML, ali vizuelno može da zavara. Postojeći injection test ubacuje custom test tool rezultat koji produkcioni registry ne proizvodi, pa ne dokazuje stvarni HTTP→provider→policy→tool lanac.
- **Preduslov:** Provider vrati schema-validan, semantički netačan ili obmanjujući final.
- **Pogođen resurs:** Integritet preporuke i dokazivost W08 tvrdnje da finalne reference odgovaraju dostupnim podacima.
- **Verovatnoća:** Srednja; LLM halucinacije su očekivane, a validator trenutno ne poredi `finding` sa tool rezultatom.
- **Uticaj:** Srednji. Ne daje write ovlašćenje zbog postojećeg allowlist-a, ali može da prikaže lažno obrazloženje i oslabi dokaz bezbednog agent toka.
- **Dokaz u kodu:** Validator proverava da `source`/`step` postoje, ali zatim prihvata bilo koji bounded `finding` (`server/agent/finalResult.ts:48-56`). `tests/agentFinal.test.ts:71-79` prihvata proizvoljnu tvrdnju čim recent history nije prazna. Evidence 014 ovo navodi kao svesno odloženo ograničenje. C1/bidi znakovi nisu obuhvaćeni regex-om koji odbija samo C0 i DEL.
- **Postojeća kontrola:** Exact schema, bounded plain text, validan source/step, plan mora biti stvarno evaluiran, prazan plan mora biti opravdan, HTML nije izvršen zbog `textContent`, unknown tool se odbija u izvršnom kodu.
- **Planirana kontrola:** Final response nosi strukturirane evidence code/value reference ili server gradi prikaz iz allowlisted činjenica tool rezultata; nema slobodnog modelskog `finding` teksta za činjenični dokaz. Plain-text policy obuhvata bidi/C1 prema unapred definisanom ugovoru. Fake provider u end-to-end HTTP testu namerno predlaže zabranjen alat nakon injection fixture-a.
- **Planirani dokaz:** Schema-validna lažna tvrdnja se odbija/normalizuje; validna kanonska referenca prolazi; nedozvoljeni tool ima nula izvršenja i ne menja stanje/scope/limite. Dokaz jasno kaže da fake test potvrđuje izvršnu politiku, ne da pravi model nikad neće slediti injection.

## R6 — Security događaji ne pokrivaju HTTP odbijanja i čuvaju se samo kao procesni stdout

**Kategorija:** Tajne, logovi i incident response
**Pogođene invarijante:** I1, I6, I7
**W08 scenariji:** T01, T03, T13, T14

- **Scenario:** Napadač šalje mnogo malformed, tuđih, cross-origin ili rate-limit zahteva. Odbijanje se desi pre `runAgent`, pa nema `shop_agent_run` događaja. Busy/not-configured se oba mapiraju na `provider_failed`, što otežava razlikovanje zloupotrebe od konfiguracije. Posle restart-a stdout i in-memory brojači/history nisu aplikaciono dostupni za poređenje.
- **Preduslov:** Zloupotreba na HTTP admission granici ili restart procesa.
- **Pogođen resurs:** Detekcija zloupotrebe, korelacija dokaza, pouzdanost rate/concurrency metrike i forenzička rekonstrukcija.
- **Verovatnoća:** Visoka kada se negativni W08 testovi pokrenu; upravo ti događaji su trenutno nevidljivi u strukturiranom agent logu.
- **Uticaj:** Srednji. Ne stvara direktno ovlašćenje, ali onemogućava dokaz i rano uočavanje napada; bez brojača je teže potvrditi da kontrola radi.
- **Dokaz u kodu:** HTTP catch samo šalje JSON error (`server/httpServer.ts:157-160`). Agent telemetry nastaje u `runAgent` (`server/agent/orchestrator.ts:93-110`), dok `createShopAgent` early failure vraća response bez telemetry događaja (`server/agent/shopAgent.ts:35-38`). Default sink piše na `console.info` (`server/agent/shopAgent.ts:12-14`). Game/history su process-local `Map`/nizovi.
- **Postojeća kontrola:** Provider attempt i run completion događaji imaju allowlisted metadata i izostavljaju prompt, key, game ID i tool rezultat. Throwing sink ne menja tok.
- **Planirana kontrola:** Jedinstven security event schema za admission accepted/denied, access denied, rate/concurrency denied, tool rejected i run completed; server correlation ID; enumerisani reason code; metrički brojači dostupni testu. Za lokalni profil dovoljan je injected sink/ring buffer u testu i single-line stdout u runtime-u; trajna baza nije potrebna. Jasno dokumentovati gubitak state-a na restartu i da se ključ nikada ne čuva u state/logu.
- **Planirani dokaz:** Svaki negativan fixture proizvodi tačno očekivan događaj bez raw input-a, game/session/token vrednosti ili newline injection-a; rani reject ima nula provider/tool poziva. Restart ograničenje je eksplicitno, ne predstavljeno kao trajna zaštita.

## Obavezni dependency nalaz van šest prioriteta

`npm audit --json` je 2026-10-28 prijavio:

| Paket | Verzija | Vrsta | Advisory sažetak | Trenutna odluka |
|---|---:|---|---|---|
| `vite` | 6.4.3 | Direktna dev zavisnost | Više `launch-editor` command/argument problema, cross-origin custom middleware i path serving nalaz | Otvoreno: proveriti lokalnu izloženost i najnižu bezbednu kompatibilnu verziju; zatim full regression |
| `source-map-js` | 1.2.1 | Tranzitivna dev/build zavisnost | Event-loop DoS kroz indexed source-map section offsets, GHSA-68fv-2mgg-jv7q | Otvoreno: utvrditi parent paket i da li aplikacija obrađuje napadački source map; nadograditi kroz kompatibilan parent |

Audit je završio exit kodom 1 i prijavio 2 high zbirna nalaza, bez critical nalaza. Ovo nije dokaz da su runtime poslovne granice bezbedne, niti se nalazi smeju automatski zatvoriti samo zato što su paketi razvojni.

## Mapa podataka preko granica

| Podatak | Kontroliše | Trenutna validacija/upotreba | Ide modelu | Čuva se |
|---|---|---|---|---|
| `gameId` | Server generiše, browser prenosi | Postojanje resursa; trenutno i praktična pristupna granica | Ne | U session `Map` do restart-a |
| Session/owner scope | Ne postoji | Nema provere | Ne | Ne |
| Goal | Browser, fiksna konstanta | Exact-key + tačan enum | Da | Samo u request kontekstu |
| Snapshot/revision | Server | Runtime snapshot validator u klijentu; stale check u agentu | Samo sanitizovan shop/tool deo | In-memory |
| Score/XP/perks | Server | Engine + tool result schema | Da, kroz tool rezultate | In-memory |
| Recent runs | Server | Max 5 i result schema | Da, kroz tool rezultat | In-memory po game container-u |
| localStorage best score | Browser | Nonnegative integer samo za prikaz | Ne | Browser localStorage |
| Model envelope | Provider | Veličina, JSON, exact envelope, tool/final validator | N/A | Ne kao raw payload |
| Tool args/results | Model/server | Exact args, allowlist, result schema i 4 KiB limit | Validiran transcript | Tokom run-a |
| Final summary/finding | Provider | Dužina, tip, control chars, source/step; nije fact-grounded | N/A | Samo response/UI |
| Telemetry | Server | Type/schema kroz TypeScript konstrukciju i allowlisted polja | Ne | stdout; nije trajno |
| Gemini ključ | Server runtime | Non-empty pri kreiranju transporta; provider header | Ne | Ne sme se čuvati u projektu/logu/browseru |

## Granice ovog pregleda

- Nisu implementirane niti izvršene popravke.
- Nije pokrenut live provider i nije korišćen stvarni ključ.
- Nije izvršen browser/DOM/CSP test; nedostatak takvog testa je deo R4.
- Typecheck/test/build baseline nije kompletan zbog lokalnog dependency/toolchain stanja. Security scan jeste prošao; audit nalazi su zabeleženi iz stvarnog izlaza.
- Bind na `127.0.0.1` smanjuje mrežnu izloženost trenutnog start skripta, ali ne uklanja nedostajuće aplikacione kontrole niti važi automatski iza drugog proxy/deployment profila.
