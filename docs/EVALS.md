# Eval Set

Svi slučajevi su napisani pre ponovljene provere posle kontrolisane AI Hint izmene. `Baseline` se odnosi na sačuvano stanje iz `baseline/BASELINE_003.md`; `N/A` znači da capability tada nije postojao, a ne da je test prolazio.

| ID | Ulaz / scenario | Očekivanje | Baseline | Posle izmene | Status |
|---|---|---|---|---|---|
| E1 | normal start | igra ostaje `ready` dok se ne pošalje validan smer | PASS | PASS | PASS |
| E2 | glava izlazi iz mreže | stanje postaje `game_over`, bez izlaska van granice | PASS | PASS | PASS |
| E3 | `{ gridSize: 9 }` | runtime fallback i jasna greška | PASS | PASS | PASS |
| E4 | hrana ispred glave | score +1, dužina +1, nova hrana nije na zmiji | PASS | PASS | PASS |
| H1 | validan lokalni AI Hint | tačan allowlisted zahtev, jedan read-only poziv, validan odgovor | N/A — UI ne postoji | PASS | PASS |
| H2 | `detail: "everything"` + `executeCode` | alat se ne izvršava, `callCount = 0` | N/A | PASS | PASS |
| H3 | `reset_game` alat | alat se ne izvršava, `callCount = 0` | N/A | PASS | PASS |
| H4 | provider failure / malformed tool ili finalni output | kontrolisana greška, nema prikazanog saveta | N/A | PASS | PASS |

Izvršivi dokaz su `tests/snake.test.ts` i `tests/hint.test.ts`: nakon izmene prolazi 16/16 testova.
