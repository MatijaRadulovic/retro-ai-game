# Shop AI Advisor Quickstart

## Prerequisites

- Node.js 22 or newer and project dependencies installed.
- A Gemini API key entered as a server runtime environment variable for the optional live check. The [README](../../README.md#lokalni-razvoj) shows hidden-input commands for Bash and PowerShell. This keeps the key out of source control and the browser bundle; never place it in a `VITE_` variable, `.env` file, or committed file.
- The [user-approved system prompt](../../docs/prompts/week4/SHOP_ADVISOR_SYSTEM_PROMPT_V1.md) is active and its game facts match the implemented rules.

## Offline verification

From the repository root, run:

```sh
npm run typecheck
npm test
npm run build
npm run security:scan
```

Focused fake transport cases should prove the [HTTP contract](contracts/shop-advice-api.md), exact attempt order, legality checks, stale responses, state invariance, and no key in browser assets. These commands do not contact Gemini.

The reliability policy permits one 10-second Flash call, two 10-second Flash-Lite calls, then three 10-second Gemma 4 calls under one 85-second deadline. Transient failures use 1, 3, 5, 5, then 5-second base delays with bounded jitter. A long `Retry-After` skips the rest of that model instead of retrying early. After two consecutive transient Flash failures across requests, later requests skip Flash for 15 minutes in that running server process.

The backend writes one sanitized JSON telemetry line per provider attempt. These records include model, adapter, attempt number, safe outcome, latency, fallback state, and provider token usage when supplied. They intentionally exclude credentials, prompts, responses, game/session IDs, and shop values.

## Manual local flow

1. Start the backend and Vite client using the README commands.
2. Begin a run, earn perk points, and open SHOP; the game pauses.
3. Press ASK SHOP AI. A pending message appears while controls remain usable.
4. On a valid answer, see BUY EXTRA XP, BUY LUCK, BUY +1 LIFE, or WAIT with a brief reason and model label. Buying remains a separate manual button action.
5. Change a perk or close the shop while waiting; an old answer must not appear.
6. With the key absent, advice reports unavailable without exposing configuration details or changing the game.

The secret input is intentionally read only in the backend terminal. Do not paste a key into chat or a command line containing the literal value: shell history and process listings can expose command arguments. Clear the terminal environment after stopping the backend.

Live provider behavior and the project's exact free-tier quotas remain unverified until a separate opt-in check is run with server runtime configuration. Use Google AI Studio's rate-limit dashboard for actual RPM/TPM/RPD; do not infer them from a different project.
