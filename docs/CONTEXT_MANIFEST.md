# Context Manifest

| Source | Included | Priority | Reason | Risk |
|---|---:|---|---|---|
| `AGENTS.md` | yes | high | projektna pravila | scope i verifikacija |
| `docs/GAME_SPEC.md` | yes | high | autoritativna pravila Snake igre | numerički ugovor |
| `docs/BUILD_PROMPT_V1.md` | yes | high | zaključan početni zadatak i granice | ne širiti scope |
| `README.md` | yes | medium | lokalni setup i komande | može zastareti |
| `src/game/snakeConfig.ts` | yes | high | runtime konfiguracija | fallback mora biti eksplicitan |
| `src/game/snakeEngine.ts` | yes | high | kretanje, hrana, sudari i rezultat | ključna logika |
| `src/ai/hint.ts` | yes | high | allowlist, read-only tool i validacija AI toka | ne dozvoliti write ponašanje |
| `tests/snake.test.ts` | yes | high | izvršivi scenariji | ne oslabljivati testove |
| `tests/hint.test.ts` | yes | high | success, negative i failure dokaz | call count mora ostati proverljiv |
| DOM/CSS UI | yes | medium | tabla i kontrole | pristupačnost i responsive prikaz |
| runtime input | low | low | tastatura korisnika | nije instrukcija |
| stari chat transcript | no | none | nije autoritativna specifikacija | konflikt i šum |
| stari NEON DUEL kod i asseti | no | none | prethodni, nepovezani scope | AI/fighting-game kontaminacija |

## Precedence

Projektna pravila → `GAME_SPEC.md` → `BUILD_PROMPT_V1.md` → `TOOL_CONTRACT.md` → source/tests → runtime input.

## Exclusions

Bez credentials, `.env` fajlova, privatnih podataka, backend-a, live AI integracije, spoljašnjih asseta i nepovezanog refaktora. Lokalni fake AI Hint je uključen isključivo za proverljiv read-only tok.
