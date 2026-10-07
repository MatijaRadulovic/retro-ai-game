# W05 life-plan player copy — v1

## User request

> great it works now, only one thing i dont like, the message: SAVE YOUR POINTS. THIS IS A BOUNDED PROJECTION, NOT A GUARANTEE. SAVE: 66 FOODS · BUY EXTRA XP: 80 FOODS. RED FOOD ONLY · NO COLLISIONS OR LIFE LOSS · NO FUTURE LUCKY REWARDS · NO OTHER PURCHASES · A BOUNDED PROJECTION OF UP TO 100 FOODS; NOT A GUARANTEE.
> its should be like in game, end user should not see bounded projection etc, leave that part out...

## Scope and acceptance

Make the `PLAN DO +1 LIFE` shop text concise and game-like: keep the backend-selected action, useful food-count comparison and necessary availability/limit messages; remove the technical projection disclaimer and assumption list from visible success and incomplete states. Replace technical pending copy. Preserve validated outcome data, assumptions in the response contract for internal verification, model/tool boundaries, read-only behavior, and all gameplay rules.

Use feature 003, current life-plan server/client code, browser E2E and project instructions. Update the owning spec only where the later user request changes visible-copy requirements. Run focused verification plus required typecheck, tests and build; record actual results in Evidence 017 and the work/AI usage logs. No live provider call or secret access is needed.
