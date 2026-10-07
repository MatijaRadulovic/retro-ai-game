# Tool Contracts and Final Result

All tools are pure functions over a validated read-only snapshot of one game. Common rules: caller is the orchestrator only; arguments are untrusted and validated before execution; result is validated before it reaches the model; timeout 200 ms; max serialized result 4 096 bytes; never touches the network, filesystem, shell, secrets, other games or authoritative mutation methods; errors are one of `invalid_arguments`, `not_available`, `timeout`, `result_invalid` (no raw detail).

Perk rules used by tools come from the authoritative engine constants (Extra XP and Luck level 0–5 costing level+1; +1 Life 0–2 charges costing 5 then 8).

## get_shop_state (Core)

- **Purpose**: return the sanitized current shop state of the run's game.
- **Mode**: READ ONLY, deterministic.
- **Input**: `{}` (exactly no fields).
- **Output**: `{ stateVersion:int, score:int, xp:int, level:int, perkPoints:int, extraXp:{level,nextCost|null}, luck:{level,nextCost|null}, extraLife:{charges,nextCost|null} }` (same fields as the W04 `ShopAdviceContext`, validated by the same derivation).
- **Authorization**: only the game of the current run, only while paused and at the run's `stateVersion`.
- **Forbidden**: board, snake, food, game ID, session internals, other games.
- **Failure**: `not_available` if the game is no longer paused or revision differs (run stops `stale`).

## evaluate_perk_plan (Core, deterministic evaluator)

- **Purpose**: simulate buying a sequence of perks from the current balance without changing anything, so the model's plan is checked by rules, not trusted.
- **Mode**: READ ONLY, deterministic, works on a copy of the state derived from the snapshot.
- **Input**: `{ plan: Array<"extra_xp"|"luck"|"extra_life"> }`, 1 to 3 items, repeats allowed, no other keys.
- **Output**:
  ```
  { stateVersion:int, valid:boolean,
    steps: Array<{ perk, cost:int|null, affordable:boolean, capped:boolean, pointsAfter:int }>,
    totalCost:int, pointsLeft:int,
    failures: Array<"unaffordable"|"capped">,
    effects: Array<{ perk, text }> }
  ```
  `valid` is true only when every step is affordable and not capped. `effects.text` is server-generated from engine constants.
- **Limits**: executed at most `maxEvaluatorCalls` (2) per run.
- **Forbidden**: calling `/perks` or any mutation; reading anything but the snapshot.
- **Failure**: `invalid_arguments` (wrong enum/length/extra keys), `not_available`.

## get_recent_runs (layer 2, option O1)

- **Purpose**: return summaries of the last finished games of this game container so the plan can reflect how the player actually does.
- **Mode**: READ ONLY, deterministic.
- **Input**: `{ limit: integer 1..5 }`.
- **Output**: `{ runs: Array<{ score:int, level:int, perksAtEnd:{extraXp:int,luck:int,extraLife:int}, endedBy:"game_over"|"won"|"restart" }> }`, newest first, at most `limit` entries, may be empty. `perksAtEnd` holds the perk levels at the end of the game; `extraLife` is the number of charges still held.
- **Authorization**: the game container of the run only. History is in memory, last 5 entries, lost on server restart.
- **Forbidden**: other containers, raw event logs, timestamps/IDs, positions.
- **Failure**: `invalid_arguments` for missing/non-integer/out-of-range `limit`.

## Allowlist

```ts
const ALLOWED_TOOLS = { get_shop_state, evaluate_perk_plan, get_recent_runs } as const;
```

Anything else (for example `delete_database`, `buy_perk`, `fetch_url`) is `unknown_tool`: rejected, never executed. `buy_perk` and every write-like name are explicitly absent.

## Final result

```ts
type AgentResult = {
  summary: string;                       // 1..200 chars, plain text
  plan: Array<"extra_xp"|"luck"|"extra_life">;   // 0..3, empty means "buy nothing yet"
  evidence: Array<{ source: ToolName; step: number; finding: string }>; // 1..4, finding 1..160 chars
  confidence: "low" | "medium" | "high";
  completed: boolean;
};
```

Semantic validation (all required):

1. Exact keys; types and lengths as above.
2. Every `evidence.source` is a tool that executed in this run, and `evidence.step` is the model step whose tool result exists.
3. Non-empty `plan` equals a plan that `evaluate_perk_plan` returned `valid: true` for in this run (same order).
4. Empty `plan` requires evidence that justifies it (state shows nothing affordable, or every perk capped).
5. If `get_recent_runs` returned `runs: []`, no evidence item may cite `get_recent_runs` as the basis for a claim about past games.
6. `completed` must be `true`; `completed: false` is rejected as an unusable final and never shown as success.
7. The revision is still current and the game is still paused.

Failing any rule is `invalid_model_proposal`. The UI shows a server-built plan line from the validated plan plus the bounded `summary`/`finding` text via `textContent`.
