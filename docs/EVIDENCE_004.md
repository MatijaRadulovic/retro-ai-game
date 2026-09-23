# Evidence 004 — Controlled AI Hint

## Implementacija

`src/ai/hint.ts` ima četiri granice: validacija modelovog predloga, allowlist alata, runtime validacija sanitizovanog tool outputa i runtime validacija finalnog `HintResponse`. UI koristi `createFakeHintModel()`; nema live provider, mreže ni API ključa.

## Dokaz slučajeva

| Scenario | Stvarni rezultat | Dokaz |
|---|---|---|
| Success | validan predlog traži `get_game_state` sa `tactical`, alat je pozvan jednom i vraćen je validan hint | test `valid AI hint request…`, `callCount = 1` |
| Read-only boundary | snapshot ne menja `GameState` i ne sadrži telo zmije | test `get_game_state exposes no body data…` |
| Invalid arguments | `detail: "everything"` sa `executeCode` je blokiran | test `invalid arguments…`, `callCount = 0` |
| Unsupported tool | `reset_game` je blokiran | test `unsupported tool names…`, `callCount = 0` |
| Tool output failure | malformed snapshot se ne prikazuje kao savet | test `a malformed read-only tool result…` |
| Provider failure | fake provider baca grešku, UI dobija bezbednu poruku | test `provider failure…` |
| Final output failure | malformed `HintResponse` se odbija | test `a malformed final response…` |

## Stvarni rezultat provere

```text
$ npm test
tests 16
pass 16
fail 0
```

## Poznato ograničenje

Ovo je kontrolisana lokalna fake/mock putanja, ne evaluacija stvarnog providera ili kvaliteta generisanog saveta. To je namerno: svi negative i failure testovi ostaju ponovljivi i bez tajni.

## Doprinos para

Članovi para su **Uroš** i **Matija**. Tehnički rad je vođen kao zajednički doprinos na implementaciji, testiranju i pregledu dokaza. Pre usmene prezentacije treba samo da potvrde tačnu individualnu podelu uloga ako predavač to posebno zatraži.
