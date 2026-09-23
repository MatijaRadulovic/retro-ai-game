# Evidence 003 — Baseline i kontrolisana promena

## Početna tvrdnja / baseline

Retro Snake core je proverljivo radio lokalno: 20 × 20 mreža, validacija konfiguracije, kretanje, hrana, sudari, pauza i restart. Sačuvan je u `baseline/BASELINE_003.md`; tada je `npm test` imao 9/9 prolaza.

## Problem

Igra nije imala ograničen način da korisnik zatraži savet. Dodavanje slobodnog teksta, mrežnog poziva ili write alata bi prekršilo minimalan i bezbedan scope.

## Hipoteza i jedna kontrolisana promena

- **Signal:** validan zahtev izvršava tačno jedan read-only poziv; nevalidan/nepodržan zahtev izvršava nula poziva; nevalidni outputi ne stižu do UI-ja.
- **Hipoteza:** strogo validiran allowlist za samo `get_game_state`, uz validaciju outputa i `HintResponse`, daje korisnu demonstraciju bez otvaranja write putanje.
- **Najmanja promena:** dodati `src/ai/hint.ts`, jedno dugme i panel, bez zavisnosti, API poziva ili izmene snake engine-a.
- **Provera:** isti core evali E1–E4 plus H1–H4 iz `EVALS.md`.
- **Rezultat:** posle izmene `npm test` je prošao 16/16; H2 i H3 dokazuju `callCount = 0`, H4 kontrolisanu grešku, a poseban test potvrđuje da snapshot ne menja state i ne vraća telo zmije.
- **Ograničenje:** lokalni fake model nije kvalitet eval stvarnog LLM-a; live provider nije deo ove predaje.

## Stvarne komande i rezultati

```text
$ npm run typecheck
exit 0

$ npm test
tests 16
pass 16
fail 0

$ npm run build
✓ 7 modules transformed.
✓ built in 51ms
```

## Doprinos

Zvanično sam prijavljen u paru sa Matijom, ali smo se dogovorili da radimo odvojeno, svako na svojoj samostalnoj verziji zadatka. Ovaj repozitorijum, implementacija, testovi i dokumentacija su samostalan rad **Uroša**.
