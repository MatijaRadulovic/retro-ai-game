# Phase 0 Research: Secure Agent Boundaries

Istraživanje je zasnovano na trenutnom kodu, W05 specifikaciji/testovima, W08 zadatku i projektnom ustavu. Ne uvodi produkcijske naloge, bazu ili novi provider.

## R1 — No-login session i ownership

**Decision:** Server izdaje privremeni opaque session cookie i odvojeni request-verification token. Cookie je `HttpOnly`, `SameSite=Strict`, ograničen na `/api`, sa ograničenim trajanjem; verifier se vraća samo pri bootstrap-u i ostaje u browser memoriji. Server čuva samo hash cookie tokena i interni scope ID. Svaka partija interno pripada jednom scope-u.

**Rationale:** `gameId` ostaje običan identifikator. HttpOnly cookie nije dostupan normalnom JavaScript-u, a odvojeni verifier + tačan origin štite automatski poslati cookie. Server state je ionako potreban za ownership, rate i concurrency.

**Alternatives considered:** `gameId` kao bearer je odbačen jer curenje ID-ja daje pun pristup; bearer u localStorage/sessionStorage je XSS-readable i nezgodan za WebSocket; client `x-user-id`, IP i Origin nisu identitet; stateless signed cookie ne uklanja potrebu za server state-om.

## R2 — HTTP i WebSocket request kontekst

**Decision:** Centralni admission redosled je: body/media type → origin/verifier/session → ownership → status → resource admission → provider/tool. Foreign i nonexistent private game koriste istu javnu not-found politiku. WebSocket koristi cookie, tačan Origin i verifier kroz subprotocol, nikada query string.

**Rationale:** Odbijanje mora da nastane pre zaštićenog čitanja i AI troška. WS browser ne može proizvoljno da postavi Authorization header, a query tokeni cure u URL/logove.

**Alternatives considered:** CORS/SameSite bez autorizacije ne zaustavljaju curl niti sve same-site cross-origin slučajeve; verifier u URL-u je odbačen zbog curenja.

## R3 — Jedinstven resource governor

**Decision:** Jedan `InMemoryResourceGovernor` deli se između session/game creation, WebSocket admission i Shop Agent-a. Synchronous `tryAcquire` operacije proveravaju i menjaju per-scope i globalne brojače bez `await`, a uspeh vraća idempotent lease.

**Rationale:** Razdvojeni per-route brojači bi mogli da se zaobiđu i lako bi dvaput oslobodili kapacitet. Jedan event loop daje dovoljnu atomarnost za dokumentovani single-process profil.

**Alternatives considered:** Proširenje `Set<gameId>` ne daje session/global politiku; fixed-window dopušta granične burst-ove; distributed limiter je van lokalnog scope-a.

## R4 — Rate, concurrency i cleanup semantika

**Decision:** Rolling prozor je `(now - 60_000, now]`; odbijeni zahtevi ne troše timestamp. Limiti su 5/session/60 s, 20/global/60 s, 1 aktivan run/session, 2/global, 3 igre/session, 100 igara/global. Predlog subscription limita je 1/game, 3/session, 100/global. Igra može da istekne posle 30 minuta bez autorizovane browser aktivnosti, ali ne dok ima subscription ili agent pin. Cleanup je lazy pre admission-a, periodičan na 60 s i potpun pri shutdown-u.

**Rationale:** Globalni backstop ostaje kada no-login requester obriše cookie. Bounded queues i eksplicitno odbijanje su predvidljiviji od automatskog izbacivanja aktivne igre.

**Alternatives considered:** LRU eviction aktivne partije može prekinuti legitimnu igru; neograničen `Map`/listener set nije prihvatljiv; timer po svakoj session nije potreban.

## R5 — Kasni provider rezultat i lease životni vek

**Decision:** Svaki raw transport promise se prati. Agent run se označava sealed kada više ne može početi novi pokušaj. HTTP može odmah vratiti deadline/cancelled rezultat, ali capacity lease se oslobađa tek kada je tracker sealed i svi započeti provider poslovi su settled. Kasni rezultat se nikad ne vraća u transcript ili success.

**Rationale:** `Promise.race`/abort ne zaustavljaju provider koji ignoriše signal. Rano oslobađanje bi omogućilo neograničen pozadinski rad.

**Alternatives considered:** Forsirani cleanup timeout koji oslobađa slot dok posao radi je nebezbedan; prava prinudna terminacija zahteva worker/process izolaciju i van je scope-a.

## R6 — Tool rezultat i grounded final

**Decision:** `validateResult(): boolean` se menja u parser koji konstruiše nov, exact-key, bounded DTO; samo normalizovan rezultat ulazi u transcript. Free-form tool effect tekst postaje structured code/value. Model final koristi source-specific evidence fact enum; aplikacija proverava fact nad tačnim cited result-om i generiše prikazni tekst. Model summary se ne prikazuje kao činjenica; poželjan je allowlisted summary code.

**Rationale:** Boolean validacija pa prosleđivanje originalnog objekta ostavlja rizik od dodatnih polja/prototipa i slobodnog teksta. Source/step bez fact-grounding-a dopušta izmišljenu tvrdnju.

**Alternatives considered:** Poređenje generisane rečenice sa JSON stringom je krhko; JSON Pointer je preširok; drugi model kao sudija dodaje trošak i novu nepouzdanu odluku.

## R7 — Prompt injection i tekstualna politika

**Decision:** Ne dodaje se free-text goal ili RAG samo radi testa. Fake provider kroz stvarni HTTP/orchestrator put namerno predlaže write/inherited/network/file/shell alat nakon zlonamernog tool-result fixture-a. Shared plain-text validator normalizuje NFC i odbija C0/C1, bidi override/isolate, zero-width/BOM, newline, tag-shaped markup, Markdown link/image i URL scheme; čuva srpska slova, apostrof i `a < b`.

**Rationale:** Test dokazuje izvršnu politiku, ne ponašanje pravog modela. `textContent` sprečava HTML izvršenje, ali stroža politika umanjuje spoofing i buduću promenu konteksta.

**Alternatives considered:** Regex sanitizacija HTML-a i rich-text renderer su van potrebe; tvrdnja da fake dokazuje da model neće slediti injection bila bi netačna.

## R8 — Security events, production headers i sentinel

**Decision:** Zatvoreni event factory emituje exact-schema događaje za admission/access/limit/tool/provider/run, sa correlation UUID, enum razlogom i bounded brojačima. Nema raw input-a, game/session ID-ja, prompta, rezultata, tokena ili ključa. Runtime sink ostaje single-line stdout i eksplicitno je volatile. Production preview dobija CSP, `nosniff`, `no-referrer`; Playwright proverava stvarni DOM, normalan tok i blokiran resurs koji nezavisno vraća HTTP 200. Sintetički sentinel se koristi samo u fake fixture-u i traži u `dist`, response-u, model request-u i eventima.

**Rationale:** HTTP early rejects trenutno nemaju telemetry, a unit `textContent` test nije browser/CSP dokaz. Allowlisted event constructors sprečavaju log injection.

**Alternatives considered:** Generički logger sa arbitrary metadata i raw provider/tool sadržajem je odbačen; 404 resurs nije CSP dokaz; marker scan je regresioni dokaz, ne opšti DLP sistem.

## Resolved limitations

- No-login session dokazuje samo privremeni browser scope, ne osobu.
- Sve kontrole su process-local i resetuju se restartom; ne važe za više procesa.
- Lokalni HTTP profil nema TLS. Javni deployment bi zahtevao HTTPS, real auth/edge abuse kontrole i deljeni store.
- Pravi provider nije potreban za adversarial testove; fake testovi ne dokazuju kvalitet ili prompt ponašanje live modela.
