# NACRT — Nedeljni izveštaj

## 1. Osnovne informacije

| Polje | Odgovor |
| --- | --- |
| Ime i prezime | Matija Radulovic |
| Adresa e-pošte | matija.radulovic077@gmail.com |
| Discord korisničko ime | Matija Radulovic |
| Nedelja | Nedelja 5 |
| Par / tim | Tim 1, sa Urošem; zajednički W05 demo je održan po mojoj potvrdi. Moj rad na sopstvenoj grani opisan je zasebno. |
| Moj konkretan doprinos / uloga | Radio sam na svojoj grani: definisao cilj i granice funkcije, pregledao i odobrio plan, usmeravao izmene za proveru agentovih koraka, prijavio problem sa čekanjem i porukom, i ručno isprobao rezultat. |
| Datum predaje | 2026-10-07 |
| Reference na rad i dokaze | W05 zadatak i dodatak sa predavanja; W05 guide i checklista; sačuvani W05 prompt v1; Spec Kit feature 003 (spec, plan, ugovori i zadaci); Evidence 013–017; promptovi za oporavak i tekst poruke; Work Log i AI Usage Log; commitovi `84e68cb` i `229f827`. |

## 2. Moj status

**Status:** Završeno

Funkcija `PLAN DO +1 LIFE` je implementirana, automatizovane provere prolaze i ja sam je ručno isprobao u igri. Zajednički W05 demo sa Urošem je održan; odbijeni predlog je pokriven kontrolisanim testovima.

## 3. Rad ove nedelje

Na svojoj grani nastavio sam rad na RETRO SNAKE igri od stanja na kraju nedelje 4. Tada je u pauziranoj prodavnici postojao read-only AI savetnik: na osnovu trenutnih poena, cena i ograničenja perkova predlagao je Extra XP, Luck, +1 Life ili čekanje, bez kupovine. To je polazno stanje opisano u Evidence 010, a Evidence 013 beleži sedam uspešnih browser scenarija pre nove funkcije.

Prvo sam pročitao W05 zadatak i dodatak o stateful agentic workflow-ima i izdvojio zahteve u W05 vodič i checklistu. Zatim sam zadao konkretan cilj za igru: u prodavnici uporediti štednju poena za sledeći +1 Life sa kupovinom jednog Extra XP nivoa pre štednje. Sačuvao sam originalni prompt, pripremio početni plan, pa tražio Spec Kit razradu. Feature 003 zato sadrži specifikaciju, ugovore za dva read-only alata, plan, zadatke i unapred definisane slučajeve provere (Evidence 014). Posebno sam insistirao da model samo predlaže korak, a aplikacija proverava format poruke, dozvoljenu akciju, rezultat alata, konačnu preporuku i uslov za završetak.

Uz pomoć coding agenta nastao je zaseban višekoračni tok `PLAN DO +1 LIFE`. Backend čuva privremeno stanje jednog run-a, reviziju partije, fazu, brojače poziva i rezultata alata. Dozvoljeni su samo `get_shop_context` i `evaluate_plan`; evaluator po pravilima igre računa koliko dodatnih crvenih hrana treba za cilj u okviru 100. Aplikacija poredi strategije, proverava evidence ID-jeve i odbacuje neispravan, ponovljen ili zastareo predlog. Plan ne kupuje perk i ne menja stanje igre. Broj koraka, alata i poziva modelu je ograničen, a postojeći `ASK SHOP AI` ostao je zaseban. Implementacija i evaluacije su u Evidence 014.

Posle prve implementacije proveravao sam da li su u memoriji između poziva sačuvani faza, validirani rezultati, status, rok i brojači, kao i da li aplikacija odlučuje kada se tok nastavlja ili prekida. Tražio sam da se dovrše testovi za neispravne rezultate alata, budžet pokušaja, zastarelu partiju i nepromenjeno stanje igre. Kada je plan u igri prikazao nedostupnost, zatražio sam rok od jednog minuta i proveru fallback-a kroz već odobrene modele. U Evidence 016 su promena na 60 sekundi, testovi oporavka i merenje lokalnog alata; merenje nije ukazalo da je alat spor. Zatim sam tražio kraći tekst koji liči na poruku u igri, bez tehničkog objašnjenja projekcije. Evidence 017 beleži tu izmenu i proveru prikaza. Odvojeno je popravljeno i početno povezivanje igre kada backend kasni (Evidence 015).

Posle završnih izmena `npm run typecheck`, `npm test` (94/94), `npm run build`, bezbednosni sken i browser testovi sa lažnim providerom (10/10) prošli su. Ja sam zatim ručno isprobao aplikaciju i potvrdio da radi. Sa Urošem sam održao zajednički W05 demo. Odbijeni nedozvoljeni predlog nije se pojavio u normalnoj igri; njegovo zaustavljanje i nula izvršenja alata provereni su kontrolisanim testovima. Obojica razumemo da aplikacija odobrava alat, proverava rezultat i zaustavlja tok. Coding agent mi je pomagao u razradi specifikacije, implementaciji, testovima i evidenciji; moje povratne informacije odredile su granice autoriteta aplikacije, rok, fallback i tekst koji igrač vidi. Ključ za AI ostao je tajna servera i nisam ga delio radi ovih provera. Pomoć tutora mi trenutno nije potrebna.

## 4. Sledeći korak

Pre druge sesije pregledaću ovaj izveštaj i predati ga tutoru uz navedene identifikatore dokaza i commitova.

## 5. Poverljiva napomena za tutora

Nema dodatne napomene.
