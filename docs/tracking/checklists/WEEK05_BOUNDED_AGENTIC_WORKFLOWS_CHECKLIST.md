# Week 5 Bounded Agentic Workflows — završna checklista

Koristi ovu listu pri završnom pregledu W05. Sve stavke su **Pending** dok se ne proveri trenutni kod i dokaz. Uz svaku označenu stavku upiši putanju testa, speca ili evidence i stvarni rezultat. `N/A` je dozvoljen samo uz obrazloženje; nastavni stretch nije uslov za Core. Ova lista ne tvrdi da je W05 implementiran. Kontekst i objašnjenja su u [W05 vodiču](WEEK05_BOUNDED_AGENTIC_WORKFLOWS_GUIDE.md).

> **Ažuriranje (2026-10-07):** [Spec Kit feature 003](../../../specs/003-ai-plan-to-next-life/) i [sačuvani prompt](../../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt) definišu odobrenu read-only akciju `PLAN DO +1 LIFE`. Spec Kit plan je završen; checklistu ocenjivati tek po kasnijoj implementaciji.

## A. Odobreni opseg i scenario

- [ ] **Pending** — W03 igra i W04 shop advisor ostaju stabilni; početni typecheck/test/build i postojeći browser smoke zapisani su pre W05 izmene.
- [ ] **Pending** — Spec Kit feature 003 opisuje fiksni cilj `PLAN DO +1 LIFE`, trigger, rezultat, success/incomplete/failure i out-of-scope; stvarno ponašanje će se proveriti po implementaciji.
- [ ] **Pending** — Novi tok je zasebna odobrena read-only akcija u istoj pauziranoj prodavnici; `ASK SHOP AI` i dalje radi, bez automatske kupovine, proizvoljnog korisničkog prompta ili promene pravila igre.
- [ ] **Pending** — Dozvoljen kontekst je minimalan, vezan za jednu igru i važeći shop snapshot; data contract ne šalje game ID, drugu sesiju, celu zmiju, tajne ili nepotrebne podatke.
- [ ] **Pending** — Modeli ostaju serverom izabrani iz postojeće Google V2 liste i pod njenom klasifikacijom grešaka; frontend ne bira provider/model.

## B. Flow i eksplicitno stanje

- [ ] **Pending** — Backend poseduje jedan run po korisničkoj akciji, sa jasnim početnim, tekućim i terminalnim statusom; UI samo prikazuje bezbedan status/rezultat.
- [ ] **Pending** — Normalan uspešan run ima tačno 4 model koraka i 3 izvršenja alata; kada je B nedostupna, 3 koraka i 2 alata, uz validiran finalni odgovor.
- [ ] **Pending** — Stanje run-a prati anonimni ID, korake, provider pokušaje, tool calls, deadline, prethodne akcije i završni razlog; brojači imaju dokumentovanu semantiku.
- [ ] **Pending** — Završetak na success, grešku, limit, ponavljanje, otkazivanje ili zastarelo stanje daje terminalni status i razlog; nijedan novi poziv ne kreće posle terminalnog statusa.
- [ ] **Pending** — Backend, ne model, odlučuje koji je sledeći dozvoljen korak, da li se predlog izvršava, kada se nastavlja i kada se run završava; modelov `final/completed/stop` predlog sam po sebi nema autoritet.
- [ ] **Pending** — Zatvaranje shopa, kupovina, nastavak, restart ili promena revizije odbacuju zastareli rezultat; ništa u agent run-u ne menja score, perkove ili game state.

## C. Alat, granice poverenja i finalni rezultat

- [ ] **Pending** — `get_shop_context` i `evaluate_plan` su jedina dva read-only backend alata; svaki ima zapisane caller/scope, tačne input/output šeme, opsege, 100 ms lokalni budžet, 8 KiB limit, greške i zabranjene efekte.
- [ ] **Pending** — Kod ima eksplicitnu allowlistu; model ne može definisati novi alat, URL, fajl, shell komandu, provider ili write akciju.
- [ ] **Pending** — Svaka poruka modela prolazi exact-key/schema, enum i faznu validaciju; akcija/proposal se proverava za allowlistu, argumente, opseg, kontekst/reviziju, budžet i ponavljanje **pre** izvršenja; odbijeni predlog daje `toolCallCount === 0`.
- [ ] **Pending** — Rezultat alata prolazi shape, veličinu, vrednosti, svežinu, privatnost i domensku/semantičku proveru pre vraćanja modelu; neispravan rezultat se odbacuje i ne koristi kao evidence.
- [ ] **Pending** — Finalni odgovor ima ograničenu šemu, proverljive evidence reference i backend semantičku proveru trenutne dostupnosti/cene perkova; nevalidan ili nepotkrepljen odgovor ne postaje success.
- [ ] **Pending** — Backend nezavisno izračunava poređenje i konačnu strategiju; kontradiktoran modelov final se odbija i ne može preglasati validirane rezultate.

## D. Budžeti, retry i failure politika

- [ ] **Pending** — Definisani i testirani su najviše 4 model koraka, 3 alata, 6 provider pokušaja za **ceo run**, 10 s po pokušaju, 30 s ukupno i veličine ulaza/izlaza.
- [ ] **Pending** — Najgori slučaj obuhvata postojeći V2 retry/fallback lanac preko svih koraka; nema implicitnog umnožavanja poziva ili skrivenog SDK retry-a.
- [ ] **Pending** — Ponovljeni isti alat/argumenti/verzija stanja bez napretka zaustavljaju run; potrošen budžet ili deadline sprečavaju novi poziv i prekidaju aktivni rad.
- [ ] **Pending** — Invalid input i forbidden proposal završavaju bez izvršenja alata; auth/config, refusal, invalid output i cancellation ne pokreću beskoristan retry/fallback.
- [ ] **Pending** — Prolazne provider greške imaju samo ograničen, klasifikovan retry/fallback unutar deadline-a; već izvršen alat se ne ponavlja ponovnim pokretanjem celog workflow-a.
- [ ] **Pending** — Za svaku validacionu, tool, provider, deadline, stale i cancellation grešku postoji aplikaciono određen bezbedan stop/recovery put, bez neograničenog pokušaja i bez lažnog success odgovora.
- [ ] **Pending** — Provider/tool failure, malformed model output, invalid tool result, timeout, limit i cancellation vraćaju bezbednu poruku bez sirovih payloadova, stack trace-a ili lažnog saveta.

## E. Testovi, evidence i bezbednost

- [ ] **Pending** — Freezeovani W05 evali iz [Evidence 014](../evidence/EVIDENCE_014.md) su izvršeni protiv kasnije implementacije bez menjanja očekivanja; baseline i expected counts su sačuvani.
- [ ] **Pending** — Fake provider/transport pokriva dva model koraka, stvarno izvršenje alata, odbijen alat sa nula izvršenja, malformed output, invalid tool result, ponavljanje, ukupni deadline i relevantno zastarevanje shopa.
- [ ] **Pending** — Testovi dokazuju da su game state i kupovine nepromenjeni tokom success i failure agent run-ova; postojeći W04 testovi ostaju zeleni.
- [ ] **Pending** — Evidence beleži architecture/flow, allowlist, konkretan success i rejected/failure run, korake i call count, stop reason, stvarne komande/exit status i poznata ograničenja; bez rekonstruisanog baseline-a ili izmišljenih live rezultata.
- [ ] **Pending** — Telemetrija razlikuje run, model korak, retry/provider pokušaj i tool call; ne sadrži ključ, game/session ID, raw prompt/response, shop vrednosti ili chain-of-thought.
- [ ] **Pending** — Ključ ostaje samo u backend runtime-u; nema izlaganja u browser bundle-u, logu, screenshotu ili dokumentaciji. `npm run security:scan` i pre-push guard su izvršeni prema potrebi; guard se obavezno izvršava pre svakog push-a.
- [ ] **Pending** — `npm run typecheck`, `npm test`, `npm run build` i relevantan browser/API smoke imaju zabeležene stvarne rezultate; eventualna ograničena live provera je odvojena od offline dokaza i ne beleži tajnu.
- [ ] **Pending** — Work log, AI usage log i task evidence imaju različite, povezane uloge; doprinos oba člana para je potvrđen bez pretpostavljanja.

## F. Završni pregled i demo

- [ ] **Pending** — Demo pokazuje korisnički cilj, dva model koraka, dozvoljeni alat, validiran rezultat, final i jasan stop reason.
- [ ] **Pending** — Negativni demo/test pokazuje odbijen predlog i `toolCallCount === 0`; oba člana umeju da objasne allowlist, limite i mesto zaustavljanja.
- [ ] **Pending** — Pregled diff-a potvrđuje da nema novih provajdera, write alata, tajni, nevezanih zavisnosti/assets ili broad refaktora.

## Opcione stavke — ne blokiraju Core

- [ ] **Optional** — Drugi smislen read-only alat ili ograničen candidate → evaluate → revise tok ima zasebne dokaze i ostaje u ukupnom budžetu.
- [ ] **Optional / trenutno van opsega** — Cross-provider fallback ili write akcija zahtevaju zasebnu promenu projektnog ugovora; kursni primeri nisu odobrenje.

## Rezultat pregleda

- **Datum / revizija:** Pending
- **Dokazni zapis:** Pending
- **Core status:** Pending
- **Otvorena odstupanja i N/A razlozi:** Pending
- **Sledeći konkretan korak:** implementirati odobreni read-only tok prema planu i proveriti freezeovane evale.
