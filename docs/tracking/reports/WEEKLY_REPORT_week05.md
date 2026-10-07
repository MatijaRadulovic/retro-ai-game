# Nedeljni izveštaj

## 1. Osnovne informacije

| Polje | Odgovor |
| --- | --- |
| Ime i prezime | Matija Radulovic |
| Adresa e-pošte | matija.radulovic077@gmail.com |
| Discord korisničko ime | Matija Radulovic |
| Nedelja | Nedelja 5 |
| Par / tim | Tim 1, sa Urošem. Moj rad na sopstvenoj grani opisan je zasebno. |
| Moj konkretan doprinos / uloga | Radio sam na svojoj grani: definisao cilj i granice funkcije, pregledao i odobrio plan, usmeravao izmene za proveru agentovih koraka, prijavio problem sa čekanjem i porukom, i ručno isprobao rezultat. |
| Datum predaje | 2026-10-07 |
| Reference na rad i dokaze | [W05 vodič](../checklists/WEEK05_BOUNDED_AGENTIC_WORKFLOWS_GUIDE.md), [W05 checklista](../checklists/WEEK05_BOUNDED_AGENTIC_WORKFLOWS_CHECKLIST.md), [početni prompt v1](../../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt), [početni plan](../../specs/WEEK05_AI_PLAN_TO_NEXT_LIFE_PLAN.md), [Spec Kit specifikacija](../../../specs/003-ai-plan-to-next-life/spec.md), [Spec Kit plan](../../../specs/003-ai-plan-to-next-life/plan.md), [API ugovor](../../../specs/003-ai-plan-to-next-life/contracts/life-plan-api.md), [model-step ugovor](../../../specs/003-ai-plan-to-next-life/contracts/model-step.md), [ugovor alata](../../../specs/003-ai-plan-to-next-life/contracts/tools.md), [zadaci](../../../specs/003-ai-plan-to-next-life/tasks.md), [Evidence 010](../evidence/EVIDENCE_010.md), [Evidence 013](../evidence/EVIDENCE_013.md), [Evidence 014](../evidence/EVIDENCE_014.md), [Evidence 015](../evidence/EVIDENCE_015.md), [Evidence 016](../evidence/EVIDENCE_016.md), [Evidence 017](../evidence/EVIDENCE_017.md), [prompt za oporavak](../../prompts/week5/CHANGE_PROMPT_LIFE_PLAN_RECOVERY_V1.md), [prompt za tekst poruke](../../prompts/week5/CHANGE_PROMPT_LIFE_PLAN_COPY_V1.md), [Work Log](../WORK_LOG.md), [AI Usage Log](../AI_USAGE_LOG.md); commitovi `84e68cb`, `229f827`, `39f7c8d` i `d858830`. |

## 2. Moj status

**Status:** Završeno

Funkcija `PLAN DO +1 LIFE` je implementirana, automatizovane provere prolaze i ja sam je ručno isprobao u igri.

## 3. Rad ove nedelje

Na svojoj grani nastavio sam rad na RETRO SNAKE igri od stanja na kraju nedelje 4. Tada je u pauziranoj prodavnici postojao read-only AI savetnik: na osnovu trenutnih poena, cena i ograničenja perkova predlagao je Extra XP, Luck, +1 Life ili čekanje, bez kupovine. To je polazno stanje opisano u Evidence 010, a Evidence 013 beleži sedam uspešnih browser scenarija pre nove funkcije.

Prvo sam pročitao W05 zadatak i dodatak o stateful agentic workflow-ima i izdvojio zahteve u [W05 vodič](../checklists/WEEK05_BOUNDED_AGENTIC_WORKFLOWS_GUIDE.md) i [checklistu](../checklists/WEEK05_BOUNDED_AGENTIC_WORKFLOWS_CHECKLIST.md). Zatim sam zadao konkretan cilj za igru: u prodavnici uporediti štednju poena za sledeći +1 Life sa kupovinom jednog Extra XP nivoa pre štednje. Sačuvao sam [originalni prompt](../../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt), pripremio [početni plan](../../specs/WEEK05_AI_PLAN_TO_NEXT_LIFE_PLAN.md), pa tražio Spec Kit razradu. [Feature 003](../../../specs/003-ai-plan-to-next-life/spec.md) zato sadrži specifikaciju, [ugovore](../../../specs/003-ai-plan-to-next-life/contracts/), [plan](../../../specs/003-ai-plan-to-next-life/plan.md), [zadatke](../../../specs/003-ai-plan-to-next-life/tasks.md) i unapred definisane slučajeve provere ([Evidence 014](../evidence/EVIDENCE_014.md)). Posebno sam insistirao da model samo predlaže korak, a aplikacija proverava format poruke, dozvoljenu akciju, rezultat alata, konačnu preporuku i uslov za završetak.

Uz pomoć coding agenta nastao je zaseban višekoračni tok `PLAN DO +1 LIFE`. Backend čuva privremeno stanje jednog run-a, reviziju partije, fazu, brojače poziva i rezultata alata. Dozvoljeni su samo `get_shop_context` i `evaluate_plan`; evaluator po pravilima igre računa koliko dodatnih crvenih hrana treba za cilj u okviru 100. Aplikacija poredi strategije, proverava evidence ID-jeve i odbacuje neispravan, ponovljen ili zastareo predlog. Plan ne kupuje perk i ne menja stanje igre. Broj koraka, alata i poziva modelu je ograničen, a postojeći `ASK SHOP AI` ostao je zaseban. Implementacija i evaluacije su u Evidence 014.

Posle prve implementacije proveravao sam da li su u memoriji između poziva sačuvani faza, validirani rezultati, status, rok i brojači, kao i da li aplikacija odlučuje kada se tok nastavlja ili prekida. Tražio sam da se dovrše testovi za neispravne rezultate alata, budžet pokušaja, zastarelu partiju i nepromenjeno stanje igre. Kada je plan u igri prikazao nedostupnost, zatražio sam rok od jednog minuta i proveru fallback-a kroz već odobrene modele. [Prompt za oporavak](../../prompts/week5/CHANGE_PROMPT_LIFE_PLAN_RECOVERY_V1.md) i [Evidence 016](../evidence/EVIDENCE_016.md) beleže promenu na 60 sekundi, testove oporavka i merenje lokalnog alata; merenje nije ukazalo da je alat spor. Zatim sam tražio kraći tekst koji liči na poruku u igri, bez tehničkog objašnjenja projekcije. [Prompt za izmenu teksta](../../prompts/week5/CHANGE_PROMPT_LIFE_PLAN_COPY_V1.md) i [Evidence 017](../evidence/EVIDENCE_017.md) beleže tu izmenu i proveru prikaza. Odvojeno je popravljeno i početno povezivanje igre kada backend kasni ([Evidence 015](../evidence/EVIDENCE_015.md)).

Posle završnih izmena prošli su `npm run typecheck`, `npm test` sa 94/94 testa, `npm run build`, bezbednosni sken i browser testovi sa lažnim providerom (10/10). Ručno sam isprobao aplikaciju i potvrdio da radi. Coding agent mi je pomagao u razradi specifikacije, implementaciji, testovima i evidenciji. Svoje rezultate proveravao sam automatizovanim testovima i ručnim isprobavanjem; svojim povratnim informacijama usmerio sam granice aplikacije, rok, fallback i tekst koji igrač vidi. Tutorova pomoć mi trenutno nije potrebna.

## 4. Sledeći korak

Pre druge sesije pregledaću ovaj izveštaj i predati ga tutoru uz navedene identifikatore dokaza i commitova.

## 5. Poverljiva napomena za tutora

Nema dodatne napomene.
