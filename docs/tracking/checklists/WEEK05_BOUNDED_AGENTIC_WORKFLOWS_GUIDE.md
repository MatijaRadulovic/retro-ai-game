# Week 5 Bounded Agentic Workflows — vodič za RETRO SNAKE

Ovaj vodič sažima **W05 Assignment — Bounded Agentic Feature** (`weekly-assignment(1).md`) i dodatak **Pouzdani stateful agentic workflow-i** iz materijala predavanja. To su nastavni zahtevi i primeri, a ne odobrena izmena proizvoda. Za ocenu stvarno urađenog posla koristiti [W05 checklistu](WEEK05_BOUNDED_AGENTIC_WORKFLOWS_CHECKLIST.md) i budući task evidence.

> **Ažuriranje opsega (2026-10-07):** Korisnik je odobrio zasebnu read-only akciju `PLAN DO +1 LIFE` i naknadno zatražio Spec Kit razradu. Kanonski paket je [feature 003](../../../specs/003-ai-plan-to-next-life/); originalni zahtev je u [sačuvanom promptu](../../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt). Koristiti taj feature umesto ranijeg hipotetičkog primera niže.

## 1. Suština gradiva

W03 donosi specifikaciju i proverljiv rezultat; W04 donosi pouzdanu granicu prema modelu; W05 uvodi **jedan logički run sa stanjem i više kontrolisanih koraka**. Minimalan uspešan W05 tok je: korisnički cilj → prvi model korak predloži alat → backend validira predlog → izvrši dozvoljeni alat → validira rezultat → drugi model korak daje strukturisan odgovor → backend proveri odgovor i završi run sa razlogom.

Modelov predlog je nepoverljiv podatak. Backend poseduje stvarno stanje, listu alata, budžet, rok, odluku o izvršenju i javni odgovor. Jedan model poziv koji odmah vrati savet nije dovoljan za W05; sam retry istog zahteva takođe nije novi agent korak.

## 2. Granica postojećeg projekta

Pre W05 zahteva [projektni ugovor](../../../AGENTS.md), [shop advisor specifikacija](../../../specs/002-shop-advisor/spec.md), [bezbednosna uputstva](../../instructions/03-ai-hint-and-security.md) i [Gemini V2 plan](../../specs/GEMINI_HINT_CHANGES_V2.md) dopuštali su samo postojeći read-only savet u pauziranoj prodavnici. Korisnik je sada odobrio i zasebnu read-only akciju za plan do života, takođe samo u toj prodavnici. Backend upravlja igrama i kupovinama; AI nikad ne kupuje perk niti menja igru. Dozvoljeni su samo serverom izabrani Google modeli Gemini 3.8 Flash → Gemini 3.5 Flash-Lite → Gemma 4, pod postojećom politikom. Primeri sa drugim provajderom, pisanjem u stanje, istorijom partija ili opštim korisničkim promptom nisu automatski odobreni.

Ranija ideja u ovom vodiču bila je da se proširi `ASK SHOP AI`. Korisnikov konkretni prompt bira zasebno dugme `PLAN DO +1 LIFE` sa dva read-only alata i determinističkim poređenjem dve strategije. Tačan tok, kontekst i granice su u [Spec Kit planu](../../../specs/003-ai-plan-to-next-life/plan.md); ovaj opšti vodič ne znači da je funkcionalnost već implementirana.

Kurs traži jednu novu funkcionalnost. Konkretni korisnički prompt definiše tu funkcionalnost kao zasebnu read-only akciju u istoj prodavnici; [Spec Kit plan](../../../specs/003-ai-plan-to-next-life/plan.md) precizira njene granice bez generičkog širenja opsega.

## 3. Pre implementacije: deset odluka

U owning planskom dokumentu zapisati: (1) problem i korisnički cilj; (2) korisnički ulaz i tačan trigger; (3) korisnu izlaznu odluku; (4) minimalni kontekst koji model sme videti; (5) dozvoljene alate; (6) zabranjene akcije; (7) maksimalne korake, pozive i vreme; (8) dokaz da je cilj ostvaren; (9) uslove prekida i bezbedan neuspeh; (10) validaciju finalnog rezultata. Dodati success, partial/incomplete, failure, out-of-scope i eventualne tačke ljudske potvrde. Ovo su odluke za konkretan plan, ne podrazumevane vrednosti iz primera predavača.

Za RETRO SNAKE: browser treba da pošalje samo odobren mali zahtev; backend vezuje run za jednu igru i uzima važeći shop snapshot. Ne slati modelu game ID, druge sesije, celu zmiju, izvorni kod, tajne ili proizvoljan korisnički tekst. Kada se shop zatvori, kupi perk, igra nastavi/restartuje ili se revizija promeni, rezultat mora biti tretiran kao zastareo. Sačuvati postojeće server-side čuvanje `GEMINI_API_KEY` i postojeće pravilo da ništa iz AI toka ne menja autoritativno stanje.

## 4. Backend run kao mala state mašina

```text
created → running → completed | stopped | failed
             │
             ├─ model predlog → validacija → read-only alat → validacija rezultata
             └─ model final → strukturna i semantička validacija → UI
```

Stanje run-a treba da ima anonimni run ID, status, cilj, brojače model koraka, provider pokušaja i izvršenih alata, početak/deadline, skorije kanonske akcije i završni razlog. Definisati kada svaki brojač raste, posebno da li odbijeni predlog troši korak, a **ne** brojač izvršenih alata. Terminalni status je nepovratan; svaki izlazni put beleži razlog, uključujući completed, invalid proposal/arguments, unknown tool, tool/provider failure, step/tool/call limit, deadline, repeated action, stale state i cancelled.

Budžeti su nezavisni: maksimum agent koraka, maksimum alata, maksimum provider pokušaja **za ceo run**, pokušaji po koraku, per-call timeout, ukupni deadline i maksimalna veličina ulaza/izlaza. Brojevi `4 steps / 2 tools / 20 s` iz dodatka su ilustracija; proveriti izvodljivost u odnosu na postojeći [V2 maksimum do šest provider pokušaja i 85 s za jedan savet](../../specs/GEMINI_HINT_CHANGES_V2.md). Više model koraka može umnožiti najgori broj poziva i vreme. Nova run politika mora eksplicitno obuhvatiti svaki retry i fallback; ne preslikati W04 limit po koraku bez ukupnog limita. Provider SDK ne sme skriveno ponavljati pozive mimo evidencije. Ukupni rok se proverava pre svakog novog pokušaja ili alata i aktivni rad se otkazuje na isteku.

Ponavljanje otkrivati poređenjem naziva alata, normalizovanih argumenata i verzije stanja. Isti zahtev bez novog rezultata ili opravdanog napretka zaustaviti; ne prepustiti modelu da odluči da li je loop završen.

## 5. Ugovor i validacija alata

Najmanje jedan alat/lokalna operacija mora stvarno biti izvršen između dva model koraka u uspešnom run-u. Za svaki alat napisati: naziv i svrhu; read-only režim; dozvoljenog pozivaoca i kontekst; tačnu ulaznu i izlaznu šemu; dužine/opsege; timeout i maksimalnu veličinu; bezbedne greške; zabranjene efekte. Alat može biti obična deterministička backend funkcija. Ne dodavati trivijalan poziv samo da se ispuni forma.

Redosled provere predloga: parsiranje → šema i `kind` za trenutni korak → allowlist → argumenti → vlasništvo/kontekst → preostali budžet i deadline → zabrana ponavljanja → izvršenje. Nepoznat ili zabranjen alat i nevalidni argumenti daju **nula izvršenja**. Nakon izvršenja proveriti tipove, vrednosti, veličinu, svežinu i privatnost rezultata; modelu vratiti samo normalizovan rezultat. Tekst iz alata i korisničkog konteksta ostaje podatak, nikad nova instrukcija.

Finalni odgovor treba da bude strukturisan i ograničen: zaključak/preporuka, proverljive reference na činjenice iz dozvoljenog konteksta ili rezultata alata, status dovršenosti i eventualno sigurnost. Backend proverava šemu **i** smisao: postoje li pomenuti perkovi, mogu li se kupiti, da li dokazi postoje u ovom run-u i da li je shop revizija još važeća. `completed: true` iz modela sam po sebi ništa ne potvrđuje. Za neuspeh prikazati bezbedan status, bez sirovog model teksta ili interne dijagnostike.

## 6. Retry, fallback i observability

Novi agent korak je nova odluka na osnovu validiranog dokaza. Retry je ponavljanje **istog provider zahteva** zbog klasifikovane prolazne greške. Fallback je prelazak na sledeći unapred odobren model po [V2 politici](../../specs/GEMINI_HINT_CHANGES_V2.md). Ne ponavljati ceo workflow posle 5xx ako je alat već izvršen. Ne retry-ovati auth/config grešku, zabranjen alat, nevalidnu šemu/semantiku, refusal, otkazivanje ili privatnosno odbijanje. Prolazni 408/429/5xx, `Retry-After` i deadline ostaju pod eksplicitnom politikom.

Jedna korisnička akcija = jedan anonimni logički run. Evidencija treba da razlikuje run, model korake, provider pokušaje, retry/fallback, predložene/izvršene/odbijene alate, validacione odluke, trajanje i stop razlog. Beležiti samo bezbedne kategorije, status i providerom prijavljenu usage informaciju kada postoji. Ne beležiti game/session ID, tajne, raw prompt/response, shop vrednosti, chain-of-thought ili neograničen rezultat alata. UI prikazuje running/completed/stopped/failed i bezbednu poruku; backend ostaje bezbednosna granica.

## 7. Redosled rada i dokaz

1. Potvrditi W04 bazu i zabeležiti stvarno početno stanje u [work logu](../WORK_LOG.md). Za `PLAN DO +1 LIFE` koristiti prihvaćeni [feature 003 spec i plan](../../../specs/003-ai-plan-to-next-life/); kursni nazivi datoteka su preporuke, ne razlog za dupliranje.
2. Pre koda zamrznuti najmanje pet eval scenarija u task-specific evidence: success, unknown tool, invalid args, provider/tool failure i step limit ili repeated action. Dodati invalid initial input, malformed output, invalid tool result, deadline, cancellation, prompt injection, stale shop state i game-state invariance gde su relevantni. Zabeležiti baseline i očekivane call count-eve.
3. Napraviti fake model/transport koji vraća zadate predloge i rezultate. Implementirati mali backend orchestrator, registar alata i validatore. Testirati da nedozvoljen predlog ima `toolCallCount === 0`, uspešan run ima dva model koraka i jedno stvarno izvršenje, a svi prekidi imaju jasan razlog.
4. Tek posle offline testova povezati postojeći odobreni Google adapter i uraditi ograničen live smoke/demo kada je za to dogovorena konfiguracija. Live rezultat je dodatak; fake testovi dokazuju lokalnu kontrolu, ali ne dostupnost modela ili kvalitet stvarnog saveta. Ne unositi ključ u dokumentaciju, testove ili chat.
5. U task evidence zabeležiti arhitekturu, freezeovane evale i stvarne before/after rezultate, komande i exit status, jedan uspešan i jedan odbijen run, stop reason i ograničenja. [AI usage log](../AI_USAGE_LOG.md) beleži značajne AI doprinose, [work log](../WORK_LOG.md) kratak tok, a doprinos oba člana para potvrditi stvarnim radom; ne izmišljati atribuciju. Za implementaciju pokrenuti typecheck, test i build prema [uputstvu](../../instructions/04-testing-and-verification.md), kao i bezbednosni sken i pre-push guard pre svakog push-a.

## 8. Najvažnije napomene za završnu proveru

- **Obavezno:** korisnički cilj, dva model koraka sa validiranim izvršenjem alata između, backend state machine, runtime validacije, mali ukupni budžet, stop razlog, fake failure testovi, ograničen live prikaz i dokazni paket. U checklisti ne označavati ništa Verified bez konkretne putanje, testa ili izlaza.
- **Posebno rizično:** implicitni retry po svakom koraku, ponavljanje celog run-a, verovanje validnom JSON-u bez semantičke provere, zastareo shop snapshot, izmišljeni dokaz u finalnom odgovoru i logovanje osetljivog konteksta.
- **Nastavni stretch, van sadašnjeg opsega:** drugi provajder, write alat uz ljudsku potvrdu, browser/shell/filesystem/web agent, swarm, RAG i opšta autonomija. Više alata ili poziva samo po sebi ne poboljšava zadatak. Course predlog od do 15 live razvojnih run-ova i do 3 demo run-a je smernica za trošak, ne obaveza ili odobrenje za pozivanje providera.
- **Demo za par:** pokažite cilj → odobren predlog → rezultat alata → final, zatim odbijeni alat sa nula izvršenja, brojače, stop razlog i poznata ograničenja. Oboje treba da umeju da objasne gde je granica izvršenja.

## Izvori i prioritet

- Predavanje: `weekly-assignment(1).md`, W05 Assignment — Bounded Agentic Feature; `week-05-bounded-agentic-workflows-reliable-integration-addendum.md`, Week 05 Addendum. Oba su korisnički dostavljena u Downloads; ovaj vodič ih sažima i prilagođava projektu.
- Projektni autoritet: trenutni korisnički zahtev → [`AGENTS.md`](../../../AGENTS.md) → prihvaćene [specifikacije](../../INSTRUCTIONS.md#project-source-of-truth) → implementacija/testovi. Novi W05 feature spec će definisati konkretan prihvaćen scenario; ovaj vodič ga ne zamenjuje.
