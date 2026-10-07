# Week 5 Bounded Agentic Workflows — završna checklista

Koristi ovu listu pri završnom pregledu W05. Početni status svake stavke je **Pending** dok se ne proveri trenutni kod i dokaz. Uz svaku označenu stavku navedi test/spec/evidence i stvarni rezultat. `N/A` je dozvoljen samo uz obrazloženje; nastavni stretch nije uslov za Core. Trenutni status implementacije i preostali ljudski koraci navedeni su u odeljku „Rezultat pregleda“. Kontekst i objašnjenja su u [W05 vodiču](WEEK05_BOUNDED_AGENTIC_WORKFLOWS_GUIDE.md).

> **Ažuriranje (2026-10-07):** [Spec Kit feature 003](../../../specs/003-ai-plan-to-next-life/) i [sačuvani prompt](../../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt) definišu odobrenu read-only akciju `PLAN DO +1 LIFE`. Spec Kit plan je završen; trenutni statusi prate implementaciju i Evidence 014 iteraciju 3.

## A. Odobreni opseg i scenario

- [x] **Verified** — W04 polazno stanje je postojeći read-only shop advisor koji po poenima, cenama i cap-ovima predlaže Extra XP, Luck, +1 Life ili čekanje; [Evidence 010](../evidence/EVIDENCE_010.md) i [Evidence 013](../evidence/EVIDENCE_013.md) beleže automatizovane i pre-W05 browser provere. Sveža implementaciona baza 55/55 i build/security provere su u [Evidence 014](../evidence/EVIDENCE_014.md).
- [x] **Verified** — Spec Kit feature 003 opisuje fiksni cilj `PLAN DO +1 LIFE`, trigger, rezultat, success/incomplete/failure i out-of-scope; stvarno ponašanje će se proveriti po implementaciji.
- [x] **Verified** — Novi tok je zasebna odobrena read-only akcija u istoj pauziranoj prodavnici; `ASK SHOP AI` i dalje radi, bez automatske kupovine, proizvoljnog korisničkog prompta ili promene pravila igre.
- [x] **Verified** — Dozvoljen kontekst je minimalan, vezan za jednu igru i važeći shop snapshot; data contract ne šalje game ID, drugu sesiju, celu zmiju, tajne ili nepotrebne podatke.
- [x] **Verified** — Modeli ostaju serverom izabrani iz postojeće Google V2 liste i pod njenom klasifikacijom grešaka; frontend ne bira provider/model.

## B. Flow i eksplicitno stanje

- [x] **Verified** — Backend poseduje jedan run po korisničkoj akciji, sa jasnim početnim, tekućim i terminalnim statusom; UI samo prikazuje bezbedan status/rezultat.
- [x] **Verified** — Normalan uspešan run ima tačno 4 model koraka i 3 izvršenja alata; kada je B nedostupna, 3 koraka i 2 alata, uz validiran finalni odgovor.
- [x] **Verified** — Stanje run-a prati anonimni ID, korake, provider pokušaje, tool calls, deadline, prethodne akcije i završni razlog; brojači imaju dokumentovanu semantiku.
- [x] **Verified** — Završetak na success, grešku, limit, ponavljanje, otkazivanje ili zastarelo stanje daje terminalni status i razlog; nijedan novi poziv ne kreće posle terminalnog statusa.
- [x] **Verified** — Backend, ne model, odlučuje koji je sledeći dozvoljen korak, da li se predlog izvršava, kada se nastavlja i kada se run završava; modelov `final/completed/stop` predlog sam po sebi nema autoritet.
- [x] **Verified** — Zatvaranje shopa, kupovina, nastavak, restart ili promena revizije odbacuju zastareli rezultat; ništa u agent run-u ne menja score, perkove ili game state.

## C. Alat, granice poverenja i finalni rezultat

- [x] **Verified** — `get_shop_context` i `evaluate_plan` su jedina dva read-only backend alata; svaki ima zapisane caller/scope, tačne input/output šeme, opsege, 100 ms lokalni budžet, 8 KiB limit, greške i zabranjene efekte.
- [x] **Verified** — Kod ima eksplicitnu allowlistu; model ne može definisati novi alat, URL, fajl, shell komandu, provider ili write akciju.
- [x] **Verified** — Svaka poruka modela prolazi exact-key/schema, enum i faznu validaciju; akcija/proposal se proverava za allowlistu, argumente, opseg, kontekst/reviziju, budžet i ponavljanje **pre** izvršenja; odbijeni predlog daje `toolCallCount === 0`.
- [x] **Verified** — Rezultat alata prolazi shape, veličinu, vrednosti, svežinu, privatnost i domensku/semantičku proveru pre vraćanja modelu; neispravan rezultat se odbacuje i ne koristi kao evidence.
- [x] **Verified** — Finalni odgovor ima ograničenu šemu, proverljive evidence reference i backend semantičku proveru trenutne dostupnosti/cene perkova; nevalidan ili nepotkrepljen odgovor ne postaje success.
- [x] **Verified** — Backend nezavisno izračunava poređenje i konačnu strategiju; kontradiktoran modelov final se odbija i ne može preglasati validirane rezultate.

## D. Budžeti, retry i failure politika

- [x] **Verified** — Limiti su 4 model koraka, 3 alata, 6 provider pokušaja za **ceo run**, 10 s po pokušaju i 60 s ukupno prema kasnijem korisničkom zahtevu. Uspešan maksimalni tok proverava 4 koraka/3 alata; timeout/deadline i run-wide provider-limit testovi proveravaju zaustavljanje.
- [x] **Verified** — Kombinovani retry/fallback test koristi svih 6 pokušaja preko uzastopnih faza i ne pokreće sledeći korak; dodatni testovi proveravaju Flash-Lite i Gemma kompletan tok posle greške/timeout-a i ponovno korišćenje uspešnog fallback-a. W04 test proverava Flash ×1, Flash-Lite ×2, Gemma ×3 lanac. Adapter koristi jedan `fetch` po evidentiranom pokušaju, bez skrivenog SDK retry-a.
- [x] **Verified** — Ponovljeni isti alat/argumenti/verzija stanja bez napretka zaustavljaju run; potrošen budžet ili deadline sprečavaju novi poziv i prekidaju aktivni rad.
- [x] **Verified** — Invalid input i forbidden proposal završavaju bez izvršenja alata; auth/config, refusal, invalid output i cancellation ne pokreću beskoristan retry/fallback.
- [x] **Verified** — Prolazne provider greške imaju samo ograničen, klasifikovan retry/fallback unutar deadline-a; već izvršen alat se ne ponavlja ponovnim pokretanjem celog workflow-a.
- [x] **Verified** — Za svaku validacionu, tool, provider, deadline, stale i cancellation grešku postoji aplikaciono određen bezbedan stop/recovery put, bez neograničenog pokušaja i bez lažnog success odgovora.
- [x] **Verified** — Provider/tool failure, malformed model output, invalid tool result, timeout, limit i cancellation vraćaju bezbednu poruku bez sirovih payloadova, stack trace-a ili lažnog saveta.

## E. Testovi, evidence i bezbednost

- [x] **Verified** — Svi freezeovani W05-01–W05-25 evali imaju after-run outcome u Evidence 014 bez menjanja očekivanja; očekivani count-evi i ograničenja su zabeleženi. Postojeći pre-W05 browser baseline je u Evidence 013.
- [x] **Verified** — Fake provider/transport pokriva validan višekoračni run, odbijen alat sa nula neodobrenih izvršenja, malformed proposal, ponavljanje, ukupan provider budžet/deadline i zastarevanje.
- [x] **Verified** — W05-15 proverava izmenjen/extra-field rezultat, empty result, exception i oversized tool result kroz runner; nevalidan rezultat se ne prosleđuje dalje i telemetrija beleži neuspešan tool call.
- [x] **Verified** — Success i provider-failure run porede game snapshot pre i posle; fake-provider browser smoke proverava nepromenjenu progression state. Postojeći W04 testovi ostaju zeleni.
- [x] **Verified** — Evidence 014 iteration 5 records implementation, frozen-eval outcome map, state/tool/provider counts, stop reasons and actual command results; korisnikova ručna provera je zasebno označena kao korisnički prijavljen rezultat.
- [x] **Verified** — Telemetrija razlikuje run, model korak, retry/provider pokušaj i tool call; ne sadrži ključ, game/session ID, raw prompt/response, shop vrednosti ili chain-of-thought.
- [x] **Verified** — Ključ ostaje samo u backend runtime-u; nema izlaganja u browser bundle-u, logu, screenshotu ili dokumentaciji. `npm run security:scan` i pre-push guard su izvršeni prema potrebi; guard se obavezno izvršava pre svakog push-a.
- [x] **Verified** — `npm run typecheck`, `npm test`, `npm run build` i relevantan browser/API smoke imaju zabeležene stvarne rezultate; eventualna ograničena live provera je odvojena od offline dokaza i ne beleži tajnu.
- [ ] **Pending** — Work log, AI usage log i task evidence imaju različite, povezane uloge. Ljudski pregled u paru i potvrda doprinosa oba člana još nisu održani.

## F. Završni pregled i demo

- [x] **Verified** — Fake-provider browser smoke pokazuje, dva model koraka, dozvoljeni alat, validiran rezultat, final i jasan stop reason.
- [ ] **Pending** — Negativni fake-provider test pokazuje odbijen predlog i `toolCallCount === 0`; ljudska demonstracija i objašnjenje allowliste, limita i tačke zaustavljanja od oba člana para još nisu zabeleženi.
- [x] **Verified** — Final diff review confirms no new provider, write tool, secret, unrelated dependency/asset or broad refactor.

## Opcione stavke — ne blokiraju Core

- [ ] **Optional** — Drugi smislen read-only alat ili ograničen candidate → evaluate → revise tok ima zasebne dokaze i ostaje u ukupnom budžetu.
- [ ] **Optional / trenutno van opsega** — Cross-provider fallback ili write akcija zahtevaju zasebnu promenu projektnog ugovora; kursni primeri nisu odobrenje.

## Rezultat pregleda

- **Datum / revizija:** 2026-10-07 / implementation worktree after planning commit `84e68cb`
- **Dokazni zapis:** [Evidence 013](../evidence/EVIDENCE_013.md) W04 browser baseline; [Evidence 014](../evidence/EVIDENCE_014.md) W05 implementation/evals and user acceptance; [Evidence 015](../evidence/EVIDENCE_015.md), [016](../evidence/EVIDENCE_016.md) and [017](../evidence/EVIDENCE_017.md) refinements
- **Core status:** Implemented; automated W05 eval matrix and core gates pass; korisnik je ručno isprobao aplikaciju i prijavio da radi.
- **Otvoreno:** zajednički pregled/demonstracija oba člana para čeka njihovu potvrdu. Kredencijali su isključivo server-runtime tajna; agent ih nije koristio. Pre-push guard važi samo ako se kasnije bude pushovalo.
- **Sledeći konkretan korak:** zabeležiti status timskog pregleda kada ga oba člana potvrde.
