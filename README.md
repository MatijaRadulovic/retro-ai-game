# RETRO SNAKE

Minimalna browser igra Snake sa 20 × 20 mrežom, retro izgledom i čistom TypeScript logikom.

## Lokalni razvoj

```bash
npm install
npm run dev
```

Pritisni strelicu da započneš partiju. Strelice menjaju smer, `P` ili `Space` pauziraju, a `R` ili dugme `NEW GAME` vraćaju igru u početno stanje. Rekord se čuva lokalno u browseru. Dok je partija aktivna ili pauzirana, `ASK AI FOR HINT` koristi isključivo lokalni fake/read-only tok — nema mrežnog poziva niti može menjati igru.

## Provera

```bash
npm run typecheck
npm test
npm run build
```

## Dokumentacija

- `docs/GAME_SPEC.md` — pravila igre i runtime ugovor konfiguracije.
- `docs/CONTEXT_MANIFEST.md` — uključeni kontekst i ograničenja scope-a.
- `docs/EVALS.md` i `docs/EVIDENCE_003.md` — baseline, eval skup i kontrolisana promena.
- `docs/TOOL_CONTRACT.md` i `docs/EVIDENCE_004.md` — read-only AI Hint granice i dokaz putanja.
- `docs/AI_USAGE_LOG.md` — kratka evidencija razvojnih AI odluka.
