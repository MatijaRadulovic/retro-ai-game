# W08 demo vodič — Secure the Arcade

Ovaj scenario je napravljen za osmominutni demo prema [W08 zadatku](02-Nedeljni-zadatak-Secure-the-Arcade.md). Testovi i automatizovani prikaz mogu se ponoviti; stvarnu probu sa prezenterima označiti završeno tek kada bude izvedena.

## Pregled predaje na jednoj strani

| Zahtev / rezultat | Gde se nalazi |
|---|---|
| Originalni W08 kriterijumi | [02-Nedeljni-zadatak-Secure-the-Arcade.md](02-Nedeljni-zadatak-Secure-the-Arcade.md) |
| Korak-po-korak checklist i status | [03-Plan-i-provere-Secure-the-Arcade.md](03-Plan-i-provere-Secure-the-Arcade.md) |
| Arhitektura, tokovi podataka, I1–I8, T00–T17/CSRF observed ishodi, tri BEFORE/AFTER poređenja, finalni testovi i ograničenja | [EVIDENCE_W08.md](EVIDENCE_W08.md) |
| Šest konkretnih rizika, tri prioriteta i dependency audit odluka | [04-Audit-sest-nepravilnosti.md](04-Audit-sest-nepravilnosti.md) |
| Normativni zahtevi, konkretne limite i story acceptance criteria | [SpecKit spec](../../specs/004-secure-agent-boundaries/spec.md), [plan](../../specs/004-secure-agent-boundaries/plan.md), [tasks](../../specs/004-secure-agent-boundaries/tasks.md) |
| Fake-provider HTTP/agent testovi i regression | `tests/httpServer.test.ts`, `tests/sessionSecurity.test.ts`, `tests/agentHttp.test.ts`, `tests/agentOrchestrator.test.ts`, `tests/agentTools.test.ts`, `tests/agentFinal.test.ts`, `tests/resourceGovernor.test.ts`, `tests/securityEvents.test.ts` |
| Browser production build, hostile result, CSP, CSRF, local state, sentinel/log capture | `scripts/e2e/secureArcade.e2e.ts`, fake provider `scripts/e2e/fakeAdvisorServer.ts` |
| W05 legacy user-flow regression | `scripts/e2e/shopAdvisor.e2e.ts` (`npm run test:e2e`) |
| AI-assisted changes and human review facts | [AI usage log](../tracking/AI_USAGE_LOG.md); individual contributions need the pair to confirm |

**Završni status (pre finalnom rerunu):** raniji `npm run test:security` i `npm run test:e2e` prolazili su; T14 je sada objedinjena kroz zajedničku allowlistovanu šemu sa korelacijom i ograničenim brojačima. Ljudska demo-proba i potvrda doprinosa oba člana i dalje čekaju.

## Pre demo-a

Iz repo root-a instalirati zavisnosti, Chromium i pokrenuti kompletan offline gate:

```sh
npm ci
npx playwright install chromium
npm run test:security
npm run test:e2e
npm run security:scan
npm audit
```

Očekivanje za `npm audit`: 0 ranjivosti posle kompatibilne patch nadogradnje Vite-a i `source-map-js`. `test:security` pokriva 146 unit/integration testova i production-preview browser journey. `test:e2e` pokriva dodatnih sedam W05 interakcija. Nijedna komanda ne zahteva Google ključ ili live provider.

Za ručni normalni tok pokrenuti dva terminala:

```sh
PORT=3001 CLIENT_ORIGIN=http://127.0.0.1:5173 E2E_SEED_PERK_POINTS=1 npx tsx scripts/e2e/fakeAdvisorServer.ts
```

```sh
npm run dev -- --host 127.0.0.1
```

Otvoriti `http://127.0.0.1:5173`. Fake server daje jedan perk point pri prvom pauziranju da bi agentov dozvoljeni plan bio demonstrabilan. Ovo je samo lokalni fixture; produkcioni server i agent kod se izvršavaju, ali Google provider je zamenjen fake-om.

## Osmominutni raspored

| Vreme | Prikaz / šta reći | Dokaz |
|---|---|---|
| 0:00–0:40 | Misija i granica poverenja: browser, model i provider su nepouzdani; server odlučuje o scope-u, alatima i budžetu. Nema login-a ni trajne baze; session cookie označava anonimni browser scope, ne stvarnu osobu. | [spec.md](../../specs/004-secure-agent-boundaries/spec.md), [arhitektura i data flow](EVIDENCE_W08.md#3-arhitektura-i-granice-poverenja) |
| 0:40–2:00 | Igraj/pauziraj. Klikni Shop Strategist. Prikaži tri provider koraka: `get_shop_state` → `evaluate_perk_plan` → final. Naglasi da su prva dva stvarna registry tool izvršenja, oba read-only; score, XP/perk i revision ostaju isti. | Browser; [T00 evidence](EVIDENCE_W08.md#6-zamrznuta-test-matrica--očekivanja-pre-izvršenja), `tests/agentHttp.test.ts` |
| 2:00–3:10 | Zloupotreba 1 — same-site, cross-origin form submit šalje cookie, ali nema verifier. Prikaži `403 request_forbidden`, pauzirano stanje i unchanged provider-attempt/run-summary brojače. To je server deny, ne samo CORS blokada. | Playwright T14/CSRF deo `scripts/e2e/secureArcade.e2e.ts`; A/B ownership testovi `tests/httpServer.test.ts` |
| 3:10–4:25 | Zloupotreba 2 — fake provider vraća final sa `<img onerror>`, `javascript:` linkom i sentinel-om; app odbacuje modelov slobodni opis i gradi odgovor iz validiranog evidence-a. Pokaži da nema opasnog DOM-a ni JS izvršenja, a plan je i dalje čitljiv. | Playwright T04/T05; forbidden `buy_perk` test: `W08 T09: HTTP agent route rejects an injected forbidden tool without dispatch or state change` u `tests/agentHttp.test.ts` |
| 4:25–5:35 | BEFORE/AFTER tri prioriteta: (1) T03 tuđ `gameId`: BEFORE bez session ownership mogao je da vrati 200; AFTER uniformni deny. (2) T13 različiti game ID-jevi: BEFORE dva paralelna provider poziva; AFTER jedan po scope-u/dva globalno uz reject pre provider-a. (3) T09/T10 tool result injection: BEFORE marker je stigao u sledeći model transcript; AFTER DTO normalizacija uklanja marker i zabranjeni alat se ne izvršava. | [Frozen comparisons](EVIDENCE_W08.md#7-zamrznuti-beforeafter-scenariji) |
| 5:35–6:30 | Production zaštita: otvori test output. Pokажи stvarna CSP/`nosniff`/`no-referrer` zaglavlja; unrelated local script endpoint je zasebno potvrđen kao HTTP 200, ali browser ga je blokirao konkretnim `script-src` pravilom. Igra, WebSocket i W05 ostaju funkcionalni. | `PASS T16` iz `npm run test:security`; `vite.config.ts`; `scripts/e2e/secureArcade.e2e.ts` |
| 6:30–7:20 | Ograničenja: `localStorage` može lažirati dekorativni best-score broj; ne postaje serverski rezultat niti pravo. Session/kvote/history su process-local i resetuju se restartom. Fake provider dokazuje enforcement, ne ponašanje svakog live modela. | T15/T16 observed redovi i ograničenja u `EVIDENCE_W08.md` |
| 7:20–8:00 | Pokreni ili pokaži poslednji `npm run test:security` summary: 146/146, Playwright browser PASS, production build PASS. Navedi gde su SpecKit i evidence, pa prepusti individualna pitanja. | `specs/004-secure-agent-boundaries/{spec,plan,tasks}.md`; ovaj vodič; `EVIDENCE_W08.md` |

## Ručne probe i rezervni plan

- Ako je live pregled usporen, pokaži `npm run test:security` browser output; ne menjaj CSP niti koristi `--disable-web-security`.
- Za ručno proveravanje origin-a, koristi drugi port na istom `127.0.0.1` host-u (same-site, different-origin) i test form iz browser fixture-a. Očekivan je `403`; proveri da se partija i agent brojači nisu promenili.
- Ne prikazuj `.env`, key material, cookies/verifier vrednosti ili raw prompt/loge. Marker u testu je sintetički i namerno bezvredan.
- Za zabranu alatke koristi automatizovani fake-provider test; pravi modelu ne daj alat za kupovinu. Normalni demo je samo sa fake provider-om.

## Checklist za izvođenje

- [ ] Pre-demo komande su prošle na čistom checkout-u.
- [ ] Normalan W05 tok staje u 80 sekundi i pokazuje 3 model koraka / 2 dozvoljena alata.
- [ ] Dva zloupotrebna scenarija su uvežbana; deny i nulti neželjeni efekat su vidljivi.
- [ ] Tri BEFORE/AFTER poređenja su spremna bez tvrdnje da je fake test live-model dokaz.
- [ ] CSP blokada i realna response zaglavlja su pokazana.
- [ ] Ograničenja i oba člana para/AI doprinos navedeni su samo na osnovu potvrđenih činjenica.
