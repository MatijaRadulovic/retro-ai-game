# Feature Specification: Run XP and Perks

**Feature Branch**: `001-powerups-perks`

**Created**: 2026-09-29

**Status**: Approved — Phase 1 implementation in progress

**Input**: [Current XP/perks build prompt](../../docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V3.md)

The [Base Game Specification](../../docs/specs/BASE_GAME_SPEC.md) remains unchanged and describes
the core game. This feature specification defines the approved Phase 1 additions.

## User Scenarios & Testing

### User Story 1 — Earn XP and perk points (Priority: P1)

As a player, I earn XP from food, advance through levels, and receive perk points that I can spend in
the current run.

**Independent Test**: Use deterministic food and XP fixtures at threshold boundaries and confirm
XP, level, points, score, growth, and restart values.

**Acceptance Scenarios**:

1. **Given** a new run at level 1 with 0 XP, **When** the player earns 50 XP, **Then** level becomes
   2 and one perk point is granted.
2. **Given** level 2 at 140 cumulative XP, **When** the player earns 10 XP, **Then** level becomes 3
   at 150 cumulative XP and one more point is granted.
3. **Given** one award crosses multiple thresholds, **When** the award is applied, **Then** every
   crossed level grants exactly one point.
4. **Given** a run has progression, **When** it is restarted, **Then** XP, level, points, perks, and
   Luck, lives, and any Lucky pickup return to their initial values.

### User Story 2 — Buy Extra XP from a paused shop (Priority: P2)

As a player, I can pause, inspect perk costs, spend points on Extra XP, and resume.

**Independent Test**: A paused run with known points can purchase each affordable Extra XP level;
invalid and capped purchases leave the run unchanged.

**Acceptance Scenarios**:

1. **Given** a playing run, **When** S or SHOP is activated, **Then** the server pauses and the shop
   appears over the game board without another movement tick.
2. **Given** a paused run with the shop closed, **When** S or SHOP is activated, **Then** the shop
   appears and the run remains paused.
3. **Given** the shop is open, **When** S, SHOP, or CLOSE SHOP is activated, **Then** the shop
   closes and the run resumes.
4. **Given** enough points, **When** the player buys Extra XP, **Then** the next level is applied,
   its exact cost is deducted, and future food grants 2 more XP per level.
5. **Given** enough points, **When** the player buys Luck, **Then** its next level and exact cost are
   applied and future Lucky pickup rolls use the increased chance.
6. **Given** insufficient points, maximum level, malformed input, or a non-paused run, **When** a
   purchase is requested, **Then** it is rejected without changing state or revision.

### User Story 3 — Use an extra life (Priority: P3)

As a player, I can spend earned points on a limited life charge and survive one otherwise fatal
collision while retaining run progress.

**Independent Test**: Deterministic wall and self-collision fixtures cover no life, one life, and two
lives, then verify exact retained/reset values.

**Acceptance Scenarios**:

1. **Given** zero held charges, **When** +1 Life is purchased, **Then** one charge is added for 5
   points; when one charge is held, the next charge costs 8 points.
2. **Given** a life charge, **When** a wall or self collision occurs, **Then** one charge is consumed,
   the snake respawns safely with three segments, and the run continues.
3. **Given** life recovery, **When** respawn completes, **Then** score, XP, level, unspent points,
   Extra XP level, and remaining charges are retained.
4. **Given** no held charge, **When** collision occurs, **Then** existing game-over behavior applies.

### User Story 4 — Find a Lucky pickup (Priority: P3)

As a player, I can collect a rare orange Lucky pickup to earn one perk point, and improve its spawn
chance by buying Luck levels.

**Independent Test**: Inject deterministic random values around every Luck probability boundary and
verify pickup spawn, collection reward, and no score/XP/growth side effects.

**Acceptance Scenarios**:

1. **Given** no Lucky pickup is active and red food is eaten, **When** the Luck probability roll
   succeeds, **Then** one orange pickup appears on a free cell that overlaps neither the snake nor red
   food.
2. **Given** Luck level 0 through 5, **When** a red food spawn roll occurs, **Then** its probability
   is 5%, 10%, 15%, 20%, 25%, or 30%, respectively; an active Lucky pickup prevents another roll.
3. **Given** an orange Lucky pickup, **When** the snake eats it, **Then** exactly one perk point is
   awarded and the pickup disappears without changing score, XP, or snake length.
4. **Given** a Lucky pickup or Luck level, **When** the run restarts, **Then** both reset; life
   recovery retains Luck and relocates the pickup only if it would overlap the respawn state.

### Edge Cases

- Level is derived from cumulative XP; a single award may cross multiple levels without skipping
  points.
- Extra XP costs by next purchased level are 1, 2, 3, 4, and 5; level 5 is the cap.
- Extra Life costs depend on held charges: 5 at zero and 8 at one; at most two charges are held.
- If a life respawn overlaps food, food is moved without awarding a pickup. The safe respawn cannot
  overlap snake segments or food.
- Purchase requests outside `paused`, with extra/unknown fields, or without enough points are
  rejected atomically without publishing a new revision.
- Restart clears all run progression and charges. Life recovery continues the existing run.
- Shop visibility is client presentation state; pause and all game/progression state remain server
  authoritative.

## Requirements

### Functional Requirements

- **FR-001**: A new run MUST start with 0 XP, level 1, 0 perk points, Extra XP level 0, Luck level 0,
  0 held life charges, and no Lucky pickup.
- **FR-002**: Eating food MUST grant 10 XP plus 2 XP for each Extra XP level purchased.
- **FR-003**: Reaching level `n + 1` MUST require `50 × n` XP since reaching level `n`. Cumulative
  thresholds begin at 50 XP for level 2, 150 for level 3, and 300 for level 4.
- **FR-004**: Each level gained MUST grant exactly one perk point, including every level crossed by
  one XP award.
- **FR-005**: Extra XP MUST have levels 0 through 5 and cost 1, 2, 3, 4, and 5 perk points for
  purchased levels 1 through 5 respectively.
- **FR-006**: +1 Life MUST grant one held charge, cost 5 points when 0 charges are held and 8 points
  when 1 is held, and never allow more than 2 held charges.
- **FR-007**: A purchase MUST be accepted only while paused, deduct its exact cost atomically, and
  apply immediately. There MUST be no refund or decrement operation.
- **FR-008**: Invalid, malformed, unaffordable, over-cap, and wrong-status purchases MUST leave all
  authoritative state and revision unchanged.
- **FR-009**: S and a visible SHOP control MUST pause and show the shop over the game board during
  play. While paused with the shop closed, they MUST open it without resuming. Closing an open shop
  with S, SHOP, or CLOSE SHOP MUST resume play. A visible CLOSE SHOP action MUST continue play.
- **FR-010**: The shop MUST display perk points, each perk's current level or charges, cap, next cost
  or MAX state, and one plus-only purchase control.
- **FR-011**: The HUD and shop MUST show XP, level, perk points, Extra XP level, Luck level, and
  lives as numeric values with filled and empty cubes. The HUD perk indicators MUST occupy a
  separate row below XP, level, and perk points.
- **FR-012**: A life MUST prevent one game-ending wall or self collision, cancel the attempted move,
  safely respawn a three-segment snake, and continue the current run.
- **FR-013**: Life recovery MUST retain score, XP, level, unspent points, Extra XP level, Luck level,
  and remaining life charges.
- **FR-014**: Restart MUST reset XP, level, unspent points, Extra XP level, Luck level, and life charges while
  preserving existing game container/player identity behavior.
- **FR-015**: The server MUST own progression, perk purchases, Lucky pickup spawning/collection, lives,
  pause state, collision recovery, and snapshots. The client MUST render validated snapshots and
  submit intended actions only.
- **FR-016**: Snapshot validation MUST reject missing, extra, malformed, out-of-range, overlapping, or
  internally inconsistent progression/perk/life/Lucky-pickup data.
- **FR-017**: Existing core controls, Snake rules, score/growth outside XP, container isolation, and
  read-only Hint behavior MUST continue to work unchanged.
- **FR-018**: This phase MUST add only the single orange Lucky pickup described in FR-019–022; other
  collectible effects, Speed Boost, Shield pickup, Double Food, timed effects, persistent progression,
  accounts, online currency, and new game modes MUST remain out of scope.
- **FR-019**: Luck MUST have levels 0 through 5, with each next level costing 1, 2, 3, 4, then 5
  perk points respectively. Purchases MUST follow the paused-only atomic rules in FR-007–008.
- **FR-020**: After red food is eaten, if no Lucky pickup is active, the server MUST roll once for a
  Lucky pickup with probability `0.05 + 0.05 × luckLevel` (5% at level 0, 30% at level 5). A
  successful roll MUST place exactly one orange pickup on a free cell that overlaps neither snake nor
  red food. No roll occurs while one is active.
- **FR-021**: Eating the Lucky pickup MUST clear it and award exactly one perk point without changing
  score, XP, or snake length. The default red food MUST remain visually red; Lucky pickup MUST be
  visually orange.
- **FR-022**: Restart MUST reset Luck to level 0 and clear the pickup. Life recovery MUST retain the
  Luck level and preserve the pickup unless relocation is needed to avoid overlap with snake or red
  food. Snapshot validation MUST enforce pickup location and Luck invariants.

### Key Entities

- **Run Progression**: Cumulative XP, derived level, and unspent perk points for one run.
- **Perk Loadout**: Extra XP level and held extra-life charges, including caps and next costs.
- **Game Snapshot**: Validated server-owned view of the player's snake, score, run progression,
  perks, lives, and game status.

## Success Criteria

- **SC-001**: Deterministic tests produce correct XP, level, and point totals below, at, above, and
  across multiple thresholds.
- **SC-002**: Every Extra XP and Luck cost/cap and both life costs/cap are reflected exactly in the shop and
  authoritative outcome.
- **SC-003**: All invalid purchase cases leave complete run state and revision unchanged.
- **SC-004**: Life recovery consumes exactly one charge and retains every field listed in FR-013 in
  all wall/self collision cases.
- **SC-005**: Restart restores all FR-001 initial values while core game and Hint regressions pass.
- **SC-006**: Deterministic tests cover the six Luck spawn probabilities, one-active-item rule,
  non-overlapping placement, exact point-only collection reward, purchase costs/cap, and reset/recovery.

## Assumptions and exclusions

- Three perks are in this phase: Extra XP, +1 Life, and Luck. Luck governs only the single orange
  Lucky pickup; no other collectible effects are included.
- Spawn tuning is fixed for this phase at 5% base chance plus 5 percentage points per Luck level,
  with Luck upgrade prices matching Extra XP's 1–5 progression.
- Perk points are run-only and earned only through level-ups.
- A life respawn uses the normal starting position/direction, clears any pending movement input, and
  places food in a non-overlapping free cell if necessary.
- The base game specification is renamed to `BASE_GAME_SPEC.md` with its contents unchanged; this
  feature spec owns approved Phase 1 additions.
