# W05 Life Plan recovery change — v1

## User request

> LIFE PLAN IS UNAVAILABLE. NO PURCHASE WAS MADE. probaj da produzis limit na 1min, mozda je premalo i trebalo bi da imamo fallback na flash i besplatne modele kad greska ili dugo cekamo

> mozda je i izvrsavanje alata sporo proveri

The user clarified that “besplatni modeli” means the existing approved Google chain Flash → Flash-Lite → Gemma. This later request supersedes the original W05 30-second deadline. It does not authorize new models, providers, write actions, or a live credentialed call.

## Scope and acceptance

Update feature 003's total run deadline to 60 seconds while retaining four model steps, three read-only tools, six provider attempts across the run, and ten seconds per attempt. Confirm transient error and per-attempt timeout fallback through the existing approved chain. Prevent a successful fallback from repeatedly starting later steps on an already failed earlier model. Ensure an application-triggered timeout is eligible for fallback even when the aborted transport reports cancellation; an actual request cancellation must still stop. Measure local tool execution against its 100 ms budget. Keep safe failure output, current game authority, the W04 advisor, and server-only credentials unchanged.

Use the accepted feature 003 spec/contracts, W05 guide/checklist, game/provider implementation, and repository instructions as sources. Verify with focused fake-provider tests, full tests, build, security scan, and fake-provider E2E. Record actual results and limitations in Evidence 016, the work log, and AI usage log. Do not inspect secret files or claim a live provider result.
