# W05 plan — AI plan do sledećeg života

**Status:** plan za kasniju implementaciju; kod i W05 evaluacije još nisu izvršeni

**Datum:** 2026-10-07

**Izvor zahteva:** [tačna kopija korisnikovog prompta v1](../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt)
**Planski dokaz:** [Evidence 014](../tracking/evidence/EVIDENCE_014.md)

> **Status update (2026-10-07):** Ovo je početni samostalni plan. Korisnik je naknadno tražio Spec Kit razradu. Kanonski feature spec, istraživanje, implementacioni plan, data model, API/tool ugovori i quickstart sada su u [feature 003](../../specs/003-ai-plan-to-next-life/). Koristiti taj paket za kasniju implementaciju; ovaj dokument čuva početne nalaze koda i ranije obrazloženje.

## 1. Odluka o opsegu i prioritetu

Ovaj plan je nastao kada je korisnik tražio plan bez SpecKita. Korisnik je zatim promenio zahtev i tražio Spec Kit razradu. Sačuvani prompt čuva početne detalje; najnovija specifikacija i kanonski plan u feature 003 imaju prednost pri razlikama. W05 obuhvata zasebnu read-only akciju u istoj pauziranoj prodavnici; `ASK SHOP AI` ostaje funkcionalan. Pre implementacije uskladiti odgovarajuća stalna uputstva i ugovore bez proširenja na druge AI funkcije.

Ovo je sačuvani početni plan. Za aktuelni obuhvat koristiti Spec Kit feature 003; Evidence 014 ostaje dokaz baseline-a i zamrznutih evaluacija.

## 2. Potvrđeno iz trenutnog koda

| Pitanje | Trenutna implementacija | Posledica za plan |
|---|---|---|
| XP od crvene hrane | `10 + 2 × extraXpLevel`; kumulativni prag za sledeći nivo iz nivoa `n` je `25 × n × (n + 1)` XP; svaki pređeni nivo daje poen. [`snakeEngine.ts`](../../src/game/snakeEngine.ts) | Projekcija koristi ista pravila i obrađuje više pragova po jednom XP događaju. |
| Cene i maksimumi | Extra XP nivoi 0–5, sledeća cena `level + 1`; +1 Life najviše dve charge, cena 5 pa 8. [`snakeEngine.ts`](../../src/game/snakeEngine.ts), [`gameSession.ts`](../../server/gameSession.ts) | Cilj je stvarna sledeća cena, uključujući drugi život; pri dve charge nema cilja. |
| Postojeći savet | `POST /api/games/:id/shop-advice`, telo `{}`, paused preflight, adapter vraća jedan `{decision,reasonCode}`. [`httpServer.ts`](../../server/httpServer.ts), [`shopAdvice.ts`](../../server/ai/shopAdvice.ts) | Nova akcija dobija zaseban endpoint/DTO i model-step ugovor; ne menjati postojeći javni odgovor. |
| Provider politika | Google allowlist: Flash ×1, Flash-Lite ×2, Gemma ×3; do 10 s po pozivu, do 85 s za sadašnji savet. [`Gemini V2`](GEMINI_HINT_CHANGES_V2.md) | Novi run ima ukupno 6 pokušaja i 60 s preko sva četiri koraka; uspešan fallback ostaje početni model narednih koraka. W04 tok zadržava 85 s. |
| Paralelnost i staleness | Sadašnji `inFlight` je privatan za shop advisor; savet proverava reviziju pre odgovora. Browser takođe odbacuje rezultat posle izmene revizije/zatvaranja shopa. | Potreban je zajednički per-game gate za oba AI dugmeta, interno vezivanje W05 run-a za početnu reviziju i provera pre svakog koraka/odgovora. |
| Otkazivanje | Backend veže `AbortController` za zatvaranje HTTP odgovora. [Evidence 013](../tracking/evidence/EVIDENCE_013.md) beleži da Vite proxy ne prosleđuje browser abort uvek do backenda. | Backend garantuje kontrolu deadline-a i svežine; UI odmah odbacuje zastareli rezultat. Posebno testirati direktan backend abort i ponašanje kroz proxy, bez tvrdnje da proxy fizički prekida provider poziv. |
| Shop visibility | Otvorenost prodavnice postoji samo u `src/main.ts`; server zna da je igra `paused`. | Dugme je dostupno samo u otvorenoj prodavnici; backend autoritativno proverava paused, ne izmišlja server-side shop-open stanje. |

`/home/matija/Downloads/weekly-assignment.md` postoji i byte-identičan je ranije pročitanom `weekly-assignment(1).md`. Materijal je referenca, a korisnikov konkretni prompt određuje ovaj scenario.

## 3. Definicija cilja, granica i rezultata

Fiksni cilj na dugmetu `PLAN DO +1 LIFE`: proceniti da li štedeti za sledeći +1 Life ili sada hipotetički kupiti **tačno jedan** Extra XP nivo pa štedeti. Mera „što pre“ je broj **dodatno pojedenih crvenih hrana**, uz pretpostavke: bez sudara/potrošnje života, bez Lucky nagrada i drugih kupovina; pravila i ostali perkovi su konstantni. Ne tvrditi stvarno vreme, verovatnoću preživljavanja ili garantovan ishod.

`save_for_life` čuva trenutne poene i Extra XP nivo. `buy_extra_xp_then_save` lokalno oduzima stvarnu sledeću cenu i podiže Extra XP za jedan nivo; dostupna je samo ako je kupovina sada moguća. Svaka strategija se projektuje najviše **100 crvenih hrana**. Ako nijedna ne stigne do cilja unutar limita, rezultat je `incomplete`, ne „nemoguće“. Kada već ima dovoljno poena za sledeći život, aplikacija vraća direktan `completed` rezultat bez modela; kada su dve charge već dostignute, preflight vraća bezbedan `unavailable` bez modela. Maksimum života proveriti pre grane „dovoljno poena“.

Korisnički unos ostaje fiksan: browser šalje samo game ID u putanji i tačno `{}`. Model nikad ne prima ID, reviziju, board, koordinate, druge partije, tajne ili sirov GameState. Backend čuva ID i početnu reviziju samo u run-u. AI nema put do kupovine ni do promena RNG, tajmera ili igre.

## 4. Predložena arhitektura i tok

```text
PLAN DO +1 LIFE (UI) → POST /api/games/:id/life-plan  { }
  → backend preflight: game, paused, body, zajednički AI gate, cap, points
  → direktan odgovor ako se život već može kupiti
  → run {snapshot revision, context, phase, counts, deadline, signal}
  → model step 1 → get_shop_context({}) → validiran read-only rezultat
  → model step 2 → evaluate_plan({strategy,foodLimit:100}) → evidence A/B
  → model step 3 → druga dostupna strategija → drugi evidence
  → model step 4 → strukturisan final → backend semantika → javni DTO
```

Kada je Extra XP opcija nedostupna, model može završiti posle `get_shop_context` i evaluacije štednje: tri model koraka i dva izvršena alata. U normalnom slučaju su **četiri model koraka i tri izvršenja alata**. Model zaista predlaže jedno ime alata i argumente u svakom koraku; backend ne pokreće sve evaluacije unapred. Backend u svakoj fazi dozvoljava samo sledeći korak iz male state mašine. Prerani final, drugi kontekst, druga ili ponovljena evaluacija, više predloga u jednom koraku i nepoznat alat su terminalni, pre izvršenja.

Jedan run je privremen objekat u backend memoriji, vezan za jedan game ID: anonimni run ID, početna revizija, fiksni cilj, status/faza, sanitizovan kontekst, validirani tool rezultati i evidence ID-jevi, potpisi izvršenih poziva, `agentSteps`, `providerAttempts`, `toolCalls`, `startedAt/deadline`, cancellation i `stopReason`. Nema baze ili memorije između partija. `finally` oslobađa lock i čisti privremeno stanje na svim granama. Koristiti `AbortSignal` i proveru revizije/statusa pre svakog model poziva, alata i finalnog vraćanja.

**Granice (ažurirano na zahtev korisnika 2026-10-07):** najviše 4 model koraka, 3 izvršena alata, 6 provider pokušaja **u celom run-u**, 60 s ukupno i najviše 10 s po provider pokušaju uz skraćenje na preostalo vreme. Retry ne povećava broj agent koraka, ali svaki pokušaj povećava `providerAttempts`; odbijen alat ne povećava `toolCalls`. `toolName + canonicalArgs + startRevision` je potpis ponavljanja; odbiti isti poziv pre izvršenja. Ne retry-ovati validacionu grešku ili ponovno izvršavati već izvršene alate. Totalni budžet važi preko svih Google fallback modela. Uspešan fallback model ostaje početni model za naredne korake istog run-a. Važeći V2 redosled, pojedinačni maksimumi, klasifikacija grešaka i `Retry-After` ostaju; W04 congestion pravilo nije deo ovog odvojenog W05 orchestratora. Ako čekanje ne staje u rok, završiti bez novog poziva.

## 5. Tool contract i finalni ugovor pre kodiranja

Registar sadrži **samo** `get_shop_context` i `evaluate_plan`, oba read-only, lokalna, bez mreže/fajlova. Maksimalno 8 KiB serijalizovanog rezultata po alatu, najviše 100 ms lokalnog vremena i račun ograničen na 100 iteracija evaluatora. Tačan input je `{}` odnosno `{strategy:"save_for_life"|"buy_extra_xp_then_save",foodLimit:100}` bez dodatnih polja. Validacija imena, faze, argumenata, konteksta, budžeta i ponavljanja prethodi pozivu. Rezultat se opet validira pre modela.

Predloženi interni diskriminisani tipovi (tačne nazive može prilagoditi implementacija, semantika ostaje):

```ts
type Strategy = "save_for_life" | "buy_extra_xp_then_save";
type ContextResult = {
  xp: number; level: number; perkPoints: number;
  extraXp: { level: number; xpPerRedFood: number; nextCost: number | null };
  extraLife: { charges: number; maxCharges: 2; nextCost: 5 | 8 };
  rules: { foodLimit: 100; levelThreshold: "25*n*(n+1)"; pointPerLevel: 1 };
};
type Projection = {
  evidenceId: string; strategy: Strategy; foodLimit: 100;
  purchaseCostNow: number; pointsAfterPurchase: number; xpPerRedFood: number;
  projectedXp: number; projectedLevel: number; projectedPoints: number;
  assumptions: readonly ["red_food_only", "no_collisions", "no_lucky", "no_other_purchases"];
};
type EvaluationResult =
  | (Projection & { status: "reached"; foodsToGoal: number })
  | (Projection & { status: "not_reached_within_limit" })
  | { evidenceId: string; strategy: Strategy; status: "unavailable";
      reasonCode: "extra_xp_capped" | "insufficient_points"; foodLimit: 100 };
type ModelFinal = {
  recommendation: Strategy | "no_recommendation";
  reasonCode: "fewer_food" | "tie_save" | "only_save_reached"
    | "only_extra_xp_reached" | "extra_xp_unavailable" | "none_reached";
  evidenceIds: string[];
};
```

`get_shop_context` koristi jedan snapshot zamrznut na početku run-a. Interni context čuva reviziju odvojeno; tool izlaz je ne sadrži. `evaluate_plan` uzima samo strategiju i konstantan limit od modela; XP, cene i formule dobija iz internog konteksta. `evidenceId` generiše server, jedinstven je u run-u i ne otkriva game ID. Za unavailable strategiju rezultat ima samo relevantan reason code i nema projektovane brojke; time statusne grane ostaju nedvosmislene. `foodsToGoal` postoji samo za `reached`, uključujući vrednost 100 na samoj granici. Numerička polja i user tekst server rekonstruiše iz validiranog rezultata, ne iz modelove proze.

Final validacija zahteva tačne ključeve i poznate evidence ID-jeve iz tog run-a; oba validna evaluaciona dokaza kada su obe strategije dostupne; preporučenu strategiju koja je dostupna i dosledna računici; status/reviziju koji su još važeći. Ako obe stignu, bira se manje hrane, a pri izjednačenju `save_for_life`. Ako jedna stigne, bira se ona uz napomenu o limitu. Ako nijedna ne stigne, `no_recommendation` i `incomplete`. Ako B nije dostupna, A se bira samo ako stigne do cilja. `reasonCode` se proverava zajedno sa izračunatim ishodom. Neispravna finalizacija daje `unavailable`, nikad uspeh.

Javni odgovor treba da razlikuje `completed`, `incomplete`, `unavailable`, `stale`, `cancelled`, uz `revision`, trusted tekst, pretpostavke i sažeto poređenje kada su obe evaluacije prisutne. Direktan odgovor za već dostupnu kupovinu označiti kao rezultat aplikacije (`source: "application"`); model rezultat kao validiran AI plan, bez sirovih tool/model payloadova. DTO i client validator moraju odbacivati dodatna polja, nedozvoljene brojeve i nemoguće kombinacije statusa.

## 6. Evaluator: precizan algoritam i rubovi

1. Učitaj samo validiran početni XP, nivo, poene, Extra XP nivo/cenu i +1 Life cenu. Za B proveri trenutnu dostupnost i hipotetički potroši tačno jednu cenu. Ne pozivaj stvarni purchase endpoint i ne mutiraj snapshot.
2. Za svaku od najviše 100 iteracija dodaj `10 + 2 × projectedExtraXpLevel` XP za jednu crvenu hranu. Za sve novopređene pragove dodaj po jedan perk poen; ne propusti višestruki level-up u jednom događaju. Posle svake hrane proveri cilj `projectedPoints >= nextLifeCost`.
3. Ako cilj nastupi pri hrani 100, `reached` sa `foodsToGoal:100`; ako ne, `not_reached_within_limit`, bez `foodsToGoal`. Čuvaj završne XP/nivo/poene i prethodno potrošene poene iz lokalne projekcije.
4. Deliti postojeća čista pravila ili izvući uske zajedničke helper funkcije za pragove/cene. Izbegavati ponovno računanje nivoa od 1 za svaku iteraciju na velikom XP-u; krenuti od validiranog početnog nivoa, uz safe-integer i vremensku granicu. Proveriti konzistentnost helpera sa stvarnom kupovinom/award pravilima regresionim testom.

Lucky pickup može dati poene mimo level-up-a, pa evaluator polazi od **stvarnog** početnog broja neiskorišćenih poena. Projekcija samo ne dodaje buduće Lucky nagrade. Tekst u feature specifikaciji 001 koji kaže da poeni dolaze samo od level-up-a istorijski je zastareo za Lucky pickup; koristiti aktuelni kod i FR-021.

## 7. Implementacioni redosled i vlasnici fajlova

| Faza | Konkentan posao | Očekivani fajlovi/moduli | Gate |
|---|---|---|---|
| 0 | Sačuvati baseline i zamrznute evale; uskladiti stalnu projektnu formulaciju da je druga read-only shop akcija odobrena. | `docs/tracking/evidence/EVIDENCE_014.md` ili novi implementation evidence, `AGENTS.md`, `docs/instructions/03-ai-hint-and-security.md`, owning API ugovor | Bez koda dok su granice i očekivanja jasni. |
| 1 | Napraviti čist evaluator i exact tool/result validatore sa rubnim testovima. | novi uski modul uz `server/ai/`, po potrebi čisti helper u `src/game/snakeEngine.ts`; `tests/` | Determinističke projekcije, bez mutacije. |
| 2 | Izdvojiti provider-neutral model-step adapter iz postojeće implementacije samo koliko je potrebno; W04 ponašanje i odgovor ostaju isti. | `server/ai/geminiTransport.ts`, `server/ai/shopAdvice.ts`, novi W05 adapter/prompt | W04 fake testovi ostaju zeleni pre novog orchestratora. |
| 3 | Dodati run state machine, allowlist, globalni attempt budget, shared per-game AI gate, cancellation/staleness i bezbednu telemetry. | novi `server/ai/` W05 orchestrator; mali zajednički gate | Normalan run 4/3; odbijen alat 0 izvršenja; nema duplih poziva. |
| 4 | Dodati `POST /api/games/:id/life-plan`, javni DTO i client validator; zadržati stari endpoint. | `server/httpServer.ts`, `server/index.ts`, novi tip/validator u `src/ai/`, `src/api/gameClient.ts`, API ugovor | Invalid body/status/game/overlap pre providera; direktan odgovor 0 provider calls. |
| 5 | Dodati dugme, jedan iskren generički progress status, poređenje i pretpostavke u postojeći shop stil. | `index.html`, `src/main.ts`, `src/styles.css` | Stale odgovor se ne prikazuje; AI akcije ne preklapaju se; kupovine ostaju ručne. |
| 6 | Izvršiti frozen fake evale, API/browser regresiju i bezbednosne provere; zapisati stvarne rezultate. | fokusirani `tests/`, `scripts/e2e/` ako je korisno, task evidence, work/AI usage log, W05 checklista | Typecheck, full tests, build, security scan, relevantan E2E; pre-push guard samo ako se kasnije bude pushovalo. |

Ne otvarati secret fajlove. Nema live provider poziva bez nove izričite autorizacije. Ne uvoditi streaming samo radi statusa, drugi AI provider, write alat, dodatne perk strategije, bazu, multiplayer, novi framework/asset ili širok refaktor.

## 8. Freezeovani slučajevi za budući dokaz i Definition of Done

Detaljni ID-jevi i očekivanja su unapred zapisani u [Evidence 014](../tracking/evidence/EVIDENCE_014.md); sadašnji status je `N/A — funkcija još ne postoji`. Obuhvataju normalan 4/3 run, B nedostupnu, direktan odgovor pri dovoljnom saldu, max života, pragove i više level-up-ova, izjednačenje, granicu 100, incomplete, unknown/invalid/repeated tool, prerani final, izmišljeni evidence ID, semantički pogrešan final, provider greške, globalni budžet, deadline, stale/cancel i read-only/W04 regresiju.

Feature je završen tek kada su ugovor alata, flow, DTO i granice implementirani; isti zamrznuti slučajevi imaju stvarne after rezultate; `npm run typecheck`, `npm test`, `npm run build`, `npm run security:scan` i relevantan browser/API smoke imaju zabeležen izlaz; W04 savet radi kao ranije; tracker sadrži bezbedan success, rejected i failure run, ograničenja i doprinos članova samo ako je potvrđen. Live kvalitet, stvarna dostupnost i proxy abort ostaju posebno označeni ako nisu provereni.
