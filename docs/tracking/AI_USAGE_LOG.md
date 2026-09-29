# AI Usage Log

Ovaj log beleži značajne razvojne pozive i odluke, bez privatnog chain-of-thought-a, tokena ili credentials.

| # | Faza | Zašto je AI pozvan | Očekivanje | Rezultat | Sledeća odluka |
|---:|---|---|---|---|---|
| 1 | Build | napraviti minimalni proverljivi Snake core | 20 × 20 igra sa testovima i runtime config proverom | core testovi prolaze | proveriti UX i granice igre |
| 2 | Review | pronaći mali UX/robustness problem | ready stanje, pauza, mobilne kontrole i rekord | funkcije proverene lokalno | sačuvati baseline i evidence |
| 3 | Controlled AI | dodati samo read-only Hint | allowlist, validacije i fake failure putanje | 6 Hint testova prolazi | ne uvoditi live provider bez nove odluke |
| 4 | Verify | proveriti finalni paket | typecheck, test, build i browser workflow | 16/16 testova i build prolaze | potvrditi da je predaja samostalan rad |
| 5 | Review | uporediti repo sa PDF zahtevima zadatka stavku po stavku | usklađenost sa checklist-om iz Sesija 003/004 | pronađena neusklađenost: `AGENTS.md` je zabranjivao AI/tool calling, iako Sesija 004 traži read-only AI Hint | ažurirati `AGENTS.md` i ponovo pokrenuti testove |
| 6 | Fix | ispraviti `AGENTS.md` da dozvoljava samo read-only AI Hint | 16/16 testova i dalje prolaze posle izmene dokumentacije | testovi prošli 16/16 | git init i commit promene |
| 7 | Fix | ispraviti pogrešnu tvrdnju o zajedničkom radu u `EVIDENCE_003.md`/`EVIDENCE_004.md` (rad je zapravo samostalan) | dokumenti odražavaju stvarnu podelu rada | ispravljeno | napraviti nedeljni izveštaj, git init i commit |
| 8 | Review | pregledati kod (engine, config, UI, AI Hint) i uživo odigrati partiju radi provere nedostataka | funkcionalni bag ili UX propust ako postoji | nema funkcionalnih bagova; nađen sitan propust `<html lang="sr">` uz potpuno engleski UI tekst | ispraviti lang atribut, ponovo pokrenuti testove |
| 9 | Polish | dodati vizuelne "wow" efekte bez dodira game logike (CRT scanline overlay, particle burst pri jelu, screen shake na game over) | 16/16 testova i build i dalje prolaze posle čisto UI/CSS izmene | testovi prošli 16/16, build prošao | push kompletnog repoa na GitHub |
