# Baseline — Session 003

Ovaj zapis zamrzava provereno stanje Retro Snake core-a neposredno pre dodavanja AI Hint sloja 20. septembra 2026. Core game fajlovi `src/game/snakeConfig.ts`, `src/game/snakeEngine.ts` i `tests/snake.test.ts` ostali su referentni baseline za kretanje, sudare i runtime konfiguraciju.

## Pokretanje i stvarni rezultat

```text
$ npm test
tests 9
pass 9
fail 0

$ npm run build
✓ built in 51ms
```

## Vidljiv rezultat i problem

Browser je prikazivao igrivu 20 × 20 Snake tablu, rezultat, pauzu i restart. Korisnik nije imao način da zatraži taktički savet bez menjanja igre: AI Hint UI, ugovor, allowlist, validacija i failure putanja nisu postojali.

## Granica baseline-a

Ovo je baseline za kontrolisanu AI Hint promenu, ne tvrdnja o ranijem starter projektu. Pre-AI istorijski snapshot nije bio sačuvan kao zaseban Git commit, jer ovaj direktorijum nema Git repozitorijum.
