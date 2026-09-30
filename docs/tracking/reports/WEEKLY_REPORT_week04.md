# Nedeljni izveštaj

## 1. Osnovne informacije

| Polje | Odgovor |
| --- | --- |
| Ime i prezime | Matija Radulovic |
| Adresa e-pošte | matija.radulovic077@gmail.com |
| Discord korisničko ime | Matija Radulovic |
| Nedelja | Nedelja 4 |
| Par / tim | Tim 1, sa Urošem |
| Moj konkretan doprinos / uloga | Sređivanje dokumentacije i instrukcija, refaktor igre na frontend i backend, XP i perkovi, prodavnica i AI savetnik. |
| Datum predaje | 2026-09-30 |
| Reference na rad i dokaze | [Work log](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/WORK_LOG.md), [AI usage log](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/AI_USAGE_LOG.md), [Evidence 005](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_005.md), [Evidence 006](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_006.md), [Evidence 007](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_007.md), [Evidence 009](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_009.md), [Evidence 010](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_010.md), [Evidence 011](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_011.md), [Evidence 012](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_012.md). |

## 2. Moj status

**Status:** Završeno

Tokom Week 4 radio sam na refaktoru frontend/backend arhitekture, XP sistemu i perk prodavnici, kao i AI savetniku u prodavnici. Evidencija beleži prolazak testova, typecheck-a, build-a i security provera, a ručna provera aplikacije je završena.

## 3. Rad ove nedelje

Ove nedelje sam sređivao projektnu dokumentaciju i instrukcije, a zatim refaktorisao igru na frontend i backend. Backend sada upravlja stanjem igre, a frontend prikazuje stanje i šalje zahteve. Ovaj deo je opisan u [server refactor promptu](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/prompts/week4/BUILD_PROMPT_SERVER_REFACTOR.md) i [Evidence 005](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_005.md).

Uveo sam XP i perkove, uključujući Extra XP, dodatni život i Luck perk, kao i Lucky pickup koji igraču daje perk poen. Za shop sam podesio prikaz preko table i ponašanje zatvaranja koje nastavlja igru. Detalji i provere su u [promptovima za XP i perkove v1](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md), [v2](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V2.md) i [v3](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V3.md), kao i u [Evidence 006](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_006.md) i [Evidence 007](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_007.md).

Zamenio sam raniji Hint sistem savetima u pauziranoj prodavnici. AI može da preporuči kupovinu ili čekanje, ali ne kupuje perkove niti menja stanje igre. Zatim sam radio na pouzdanosti integracije: ograničenom broju pokušaja i fallback-u, validaciji odgovora, bezbednom rukovanju greškama i telemetriji. Relevantni su [Shop Advisor prompt](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/prompts/week4/BUILD_PROMPT_GEMINI_HINT_V2.md), [Gemini Hint Changes V2 plan](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/specs/GEMINI_HINT_CHANGES_V2.md), [Evidence 009](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_009.md) i [Evidence 010](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_010.md).

Popravio sam i dva problema sa Gemini zahtevima: naziv polja za system instrukciju i MIME vrednost za strukturisani odgovor. Ručni live tok je proveren i vraća validan strukturisani savet. Popravke i rezultati su u [Evidence 011](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_011.md) i [Evidence 012](https://github.com/umilutinovic25-hash/retro-ai-game/blob/main/docs/tracking/evidence/EVIDENCE_012.md).

Ja sam ručno testirao aplikaciju uz pomoć coding agenta. Work log i AI usage log beleže automatizovane rezultate sa 55/55 testova, kao i prolazak typecheck-a, build-a i security scan-a. AI agent mi je pomagao u implementaciji, dijagnostici i izmenama dokumentacije i testova; proveravao sam rezultate kroz navedene automatizovane provere i ručno isprobavanje. Tutorova pomoć mi trenutno nije potrebna.

## 4. Sledeći korak

Definisaću sledeći ograničeni obim za dodatne perkove i reasoning harness i napraviću plan sa jasnim kriterijumima završetka.

## 5. Poverljiva napomena za tutora

Nema dodatne napomene.
