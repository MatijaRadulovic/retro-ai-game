# AI Usage Log

Ovaj log beleži značajne razvojne pozive i odluke, bez privatnog chain-of-thought-a, tokena ili credentials.

| # | Faza | Zašto je AI pozvan | Očekivanje | Rezultat | Sledeća odluka |
|---:|---|---|---|---|---|
| 1 | Build | napraviti minimalni proverljivi Snake core | 20 × 20 igra sa testovima i runtime config proverom | core testovi prolaze | proveriti UX i granice igre |
| 2 | Review | pronaći mali UX/robustness problem | ready stanje, pauza, mobilne kontrole i rekord | funkcije proverene lokalno | sačuvati baseline i evidence |
| 3 | Controlled AI | dodati samo read-only Hint | allowlist, validacije i fake failure putanje | 6 Hint testova prolazi | ne uvoditi live provider bez nove odluke |
| 4 | Verify | proveriti finalni paket | typecheck, test, build i browser workflow | 16/16 testova i build prolaze | Uroš i Matija potvrđuju podelu uloga za prezentaciju |
