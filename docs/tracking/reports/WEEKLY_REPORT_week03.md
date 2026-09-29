# Nedeljni izveštaj

Pošalji popunjen izveštaj odgovornom tutoru mejlom pre druge sesije. Ne uključuj tajne, osetljive podatke ili linkove ka privatnim repozitorijumima i dokumentima. Kada dokaz postoji samo privatno, opiši ga bez URL-a i pitaj tutora za odobreni način dostavljanja.

## 1. Osnovne informacije

| Polje | Odgovor |
| --- | --- |
| Ime i prezime | Uroš Milutinović |
| Adresa e-pošte | umilutinovic25@gmail.com |
| Discord korisničko ime | urke04 |
| Nedelja | Nedelja 3 — Sesije 003 i 004, "Retro AI Engineering Challenge" |
| Par / tim | Zvanično prijavljen u paru sa Matijom (tim_1), ali smo se dogovorili da radimo odvojeno, svako na svojoj samostalnoj verziji zadatka. |
| Moj konkretan doprinos / uloga | Kompletna samostalna implementacija: Snake engine, runtime validacija konfiguracije, read-only AI Hint tok, testovi i sva prateća dokumentacija. |
| Datum predaje | 2026-09-23 |
| Reference na rad i dokaze | https://github.com/umilutinovic25-hash/retro-ai-game (javan repo). Stvarni rezultati provere: `npm run typecheck` prolazi, `npm test` → 16/16 PASS, `npm run build` uspešan. |

## 2. Moj status

**Status:** Završeno

Core deo igre (Sesija 003) i kontrolisan AI Hint tok (Sesija 004) su implementirani, dokumentovani i lokalno provereni — svi testovi prolaze. Repo je pušovan na GitHub (javan). Jedino što formalno nedostaje je da se moje ime/tim pojavi u zvaničnom spisku predavača na Discord-u (tabela od 23.9. sadrži 6 drugih projekata, ne i moj).

## 3. Rad ove nedelje

Zadatak je bio "Retro AI Engineering Challenge" — napraviti malu retro igru i dodati joj jednu kontrolisanu AI funkcionalnost, uz jasan scope, namerno biran kontekst, strukturisane ugovore i proverljiv dokaz, prateći narativnu liniju IDEJA → SPECIFIKACIJA → PROMPT+KONTEKST → BASELINE → EVAL+DOKAZ → KONTROLISANA IZMENA → TOOL CONTRACT → VALIDIRANI ODGOVOR → TEST+EVIDENCIJA.

Napravio sam RETRO SNAKE, minimalnu Snake igru na mreži 20×20 u TypeScript/Vite stacku. Pre prve veće implementacije zaključao sam scope u `docs/specs/GAME_SPEC.md` (pravila, Definition of Done, šta je van scope-a) i napisao `docs/prompts/week3/BUILD_PROMPT_V1.md` kao prvi task prompt. Dodao sam `GameConfig` sa runtime validacijom (`parseGameConfig`) koja za nevažeću konfiguraciju vraća eksplicitan bezbedan fallback i jasnu grešku, umesto da tiho nastavi sa nepoznatim vrednostima. Sačuvao sam baseline verziju pre prve kontrolisane izmene; njeni opisni detalji i mini eval rezultati sada su objedinjeni u `docs/tracking/evidence/EVIDENCE_003.md`.

Za Sesiju 004 dodao sam jednu malu, strogo ograničenu AI sposobnost — dugme "Ask AI for Hint" koje pokreće read-only tok. Model (lokalni fake/mock, bez mrežnog poziva ili API ključa) sme da predloži samo alat `get_game_state` sa allowlistovanim argumentom (`detail: "summary" | "tactical"`). Aplikacija validira naziv i argumente pre izvršenja, alat vraća sanitizovan snapshot (bez tela zmije, bez internih podataka), a zatim se validira i finalni `HintResponse`. Sve ovo je opisano u `docs/specs/TOOL_CONTRACT.md`, sa jasnim "must not return/do" granicama.

Rad sam proveravao stvarnim komandama, ne samo AI tvrdnjama: `npm run typecheck`, `npm test` (16/16 PASS — uključujući testove za validan zahtev, invalid arguments, unsupported tool, malformed tool output, provider failure i malformed final response) i `npm run build`. Rezultati su zapisani u `docs/tracking/evidence/EVIDENCE_003.md` i `docs/tracking/evidence/EVIDENCE_004.md` sa stvarnim izlazom komandi.

Jedan konkretan problem koji sam pronašao i ispravio danas: `AGENTS.md` (projektna pravila) je i dalje pisao "No ... AI, API calls, or tool calling", što je bilo tačno za Sesiju 003, ali je postalo netačno/kontradiktorno nakon što sam u Sesiji 004 dodao read-only AI Hint. Ažurirao sam `AGENTS.md` da eksplicitno dozvoljava samo taj jedan read-only tok (uz referencu na `docs/specs/TOOL_CONTRACT.md`), i ponovo pokrenuo testove da potvrdim da izmena dokumentacije nije pokvarila ništa (i dalje 16/16 PASS). Ovo je i konkretna primena saveta koji je predavač dao — propuste iz feedback-a uvrstiti u instruction fajlove da agent zna da su ubuduće protiv pravila.

AI (coding agent, Claude Code) je korišćen tokom cele nedelje za izgradnju — pisanje igre, validacione logike, AI Hint toka, testova i prateće dokumentacije (uključujući `docs/specs/GAME_SPEC.md`, `docs/prompts/week3/BUILD_PROMPT_V1.md`, Hint prompt koji je arhiviran u `docs/prompts/week3/BUILD_PROMPT_FINAL_VERSION.md`, `docs/specs/TOOL_CONTRACT.md` i dokaze u `docs/tracking/evidence/`). U vreme izrade postojali su i zasebni context manifest i eval fajlovi; njihovi zadatku specifični podaci sada su objedinjeni u `docs/tracking/evidence/EVIDENCE_003.md`, dok je Hint eval u `docs/tracking/evidence/EVIDENCE_004.md`. AI faze su zabeležene u `docs/tracking/AI_USAGE_LOG.md` (Build, Review, Controlled AI, Verify). Svaki AI predlog je proveren pokretanjem stvarnih komandi, a ne prihvaćen na reč; danas je AI dodatno korišćen da uporedi ceo repo sa zvaničnim PDF zahtevima zadatka stavku po stavku, pronađe gorepomenutu neusklađenost, i da inicijalizuje lokalni git repo i napravi commit-e.

Pre predaje sam tražio i dodatni pregled: da se prekontroliše da li igra ima funkcionalne nedostatke i da se po potrebi poboljša. Pregled koda (engine, config, UI, AI Hint) i uživo odigrana partija u browseru nisu pokazali funkcionalne bagove — kretanje, sudar, restart, pauza i AI Hint rade ispravno. Pronađen je jedan sitan propust (`<html lang="sr">` dok je ceo UI tekst na engleskom) koji je ispravljen. Dodao sam i tri vizuelna "polish" efekta koji ne diraju game logiku: CRT scanline preko table, particle burst kad zmija pojede hranu, i kratak screen shake na game over. Posle svake izmene ponovo sam pokrenuo `npm test` i `npm run build` da potvrdim da ništa nije pokvareno (i dalje 16/16 PASS).

Pomoć koja mi je potrebna od tutora: potvrda da li je prihvatljivo što smo Matija i ja, iako zvanično u paru, radili potpuno odvojene, samostalne verzije zadatka — i ispravka mog imena/tima u zvaničnom spisku predatih projekata na Discord-u, pošto se trenutno tamo ne pojavljujem.

## 4. Sledeći korak

Do kraja dana (2026-09-23, pre roka 17:00) pošaljem ovaj izveštaj i GitHub link tutoru i javiću tačno ime tima/para na Discord-u radi ispravke spiska.

## 5. Poverljiva napomena za tutora

Nema dodatne napomene.
