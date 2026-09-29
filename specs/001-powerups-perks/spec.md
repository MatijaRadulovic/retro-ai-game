# Feature Specification: Run Powerups and Perks

**Feature Branch**: `main` (planning artifacts only; no feature branch created)

**Created**: 2026-09-29

**Status**: Draft — clarified and ready for planning

**Input**: User description: [`docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md`](../../docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Earn XP and levels during a run (Priority: P1)

As a player, I earn XP when I eat food, cross visible level thresholds, and receive one spendable
perk point for each level gained so that a successful run creates meaningful progression.

**Why this priority**: XP, levels, and perk points are the economy that every perk depends on and
provide value before any shop or powerup behavior is added.

**Independent Test**: Start a fresh run, eat enough food to cross the first two thresholds, and
observe the exact XP, level, and perk-point totals; restart and observe that all run progression is
reset.

**Acceptance Scenarios**:

1. **Given** a new level-1 run with 0 XP, **When** the player eats five normal food pickups,
   **Then** the run has 50 XP, reaches level 2, and has one unspent perk point.
2. **Given** a level-2 run with 140 cumulative XP, **When** the player earns 10 XP,
   **Then** the run reaches level 3 at the 150 cumulative-XP boundary and gains exactly one
   additional perk point.
3. **Given** one XP award large enough to cross multiple thresholds, **When** the award is applied,
   **Then** every crossed level is granted in order and each level grants one perk point.
4. **Given** any progressed run, **When** the player restarts or starts a new run,
   **Then** XP, level, unspent perk points, purchased perks, active effects, and lives return to their
   initial values.

---

### User Story 2 - Buy perks from a paused shop (Priority: P2)

As a player, I can deliberately pause with S, review exact perk levels and costs, spend earned points
with plus-only controls, and resume without the game moving while I decide.

**Why this priority**: The shop converts progression into player choice while preserving fair,
server-authoritative pause behavior.

**Independent Test**: Give a paused test run known perk points, open the shop with S, buy each valid
perk, attempt unaffordable and capped purchases, and verify the displayed state and paused game state
after every action.

**Acceptance Scenarios**:

1. **Given** a playing run, **When** the player presses S or activates the visible SHOP control,
   **Then** play pauses and the perk shop is shown without an additional movement tick.
2. **Given** a paused run, **When** the player presses S repeatedly, **Then** the shop alternates
   between shown and hidden while the run remains paused.
3. **Given** a shown shop and sufficient points, **When** the player buys the next Luck or Extra XP
   level, **Then** its exact cost is deducted, the level increases by one immediately, and no refund
   or decrement control is offered.
4. **Given** 0 or 1 held life charge and sufficient points, **When** the player buys +1 Life,
   **Then** one charge is added for 5 or 8 points respectively.
5. **Given** insufficient points, a capped perk, two held lives, malformed input, or a run that is not
   paused, **When** a purchase is attempted, **Then** it is rejected with no change to progression,
   purchases, lives, score, snake, food, powerup, or revision.
6. **Given** a paused shop, **When** the player activates Resume, **Then** the shop closes and play
   continues from the unchanged paused position.

---

### User Story 3 - Collect temporary board powerups (Priority: P3)

As a player, I occasionally find a visible powerup on a free board cell and gain a predictable
temporary benefit when I collect it.

**Why this priority**: Collectibles add moment-to-moment variety while remaining independent from
the point-funded perk economy.

**Independent Test**: Use controlled chance and type selection to spawn and collect each powerup,
then verify its exact duration or pickup count through play, pause/resume, refresh, expiration, and
restart.

**Acceptance Scenarios**:

1. **Given** no board powerup, **When** food is eaten, **Then** a powerup spawn is attempted with a
   chance of 5% plus 5 percentage points per Luck level, and a successful spawn chooses each of the
   three types with equal probability.
2. **Given** a successful spawn attempt, **When** a cell is selected, **Then** the powerup occupies a
   cell containing no snake segment, food, or other powerup.
3. **Given** a collected Speed Boost, **When** five seconds of active play have not elapsed,
   **Then** each subsequent movement interval is 25% shorter than its normal current interval; pause
   time does not consume the effect.
4. **Given** a collected Double Food effect, **When** the next three food pickups are eaten,
   **Then** each grants double the normal score award and double the complete XP award while growth
   remains one segment; the fourth pickup is normal.
5. **Given** an active timed effect and another pickup of the same type, **When** it is collected,
   **Then** its duration refreshes to five seconds without multiplying its strength.

---

### User Story 4 - Survive collisions with shield or lives (Priority: P4)

As a player, I can survive a limited number of collisions through a temporary Shield or purchased
life charge while retaining the run progress I earned.

**Why this priority**: Collision recovery depends on progression and powerup foundations and changes
the most sensitive core Snake rule, so it is delivered after those systems are independently stable.

**Independent Test**: Set up deterministic wall and self collisions with Shield only, life only,
both defenses, and neither; compare the exact snake, effect, life, status, and progression state after
each attempted move.

**Acceptance Scenarios**:

1. **Given** an unexpired Shield, **When** a wall or self collision is attempted, **Then** the Shield
   is consumed first, the attempted move is canceled, the snake remains at its last safe position,
   the run keeps playing, and the player can choose a safe direction before the next tick.
2. **Given** no Shield and at least one life charge, **When** a wall or self collision is attempted,
   **Then** one life is consumed, the snake safely respawns in a valid starting formation, the run
   continues, and score, cumulative XP, level, unspent perk points, and purchased Luck and Extra XP
   levels are retained.
3. **Given** both Shield and a life charge, **When** a collision is attempted, **Then** only the Shield
   is consumed and the life remains available.
4. **Given** neither defense, **When** a collision occurs, **Then** the run ends under the existing
   collision rule.
5. **Given** a life-saving respawn, **When** board items overlap the respawn formation,
   **Then** the snake is placed safely and conflicting food or powerup positions are regenerated or
   cleared before play continues.

### Edge Cases

- Level calculation handles an award that crosses more than one threshold and never grants the same
  level or perk point twice.
- Luck at level 5 yields a 30% spawn chance; it cannot exceed level 5 or that chance.
- Extra XP at level 5 yields 20 XP per normal food and 40 XP while Double Food applies.
- Luck and Extra XP costs are 1, 2, 3, 4, and 5 points for purchased levels 1 through 5.
- +1 Life cost depends on held charges, not lifetime purchase count: 5 points at zero charges and
  8 points at one charge. After a charge is consumed, the lower applicable held-charge cost returns.
- A powerup spawn roll is skipped while a board powerup exists; active effects do not prevent a new
  board powerup from spawning.
- An uncollected board powerup remains until collected, displaced by the food-priority rule, or reset;
  it does not expire with elapsed time.
- When the only non-snake cell is occupied by a board powerup after food is eaten, food placement has
  priority: the board powerup is removed and food is placed there. The run is won only when no
  non-snake cell exists.
- Collecting a powerup without eating food does not change score, XP, or snake length.
- A timed effect with no active-play time remaining is expired before it can affect the next move or
  collision. Pause time never decreases remaining duration.
- Collecting Shield while Shield is active refreshes it to one protected collision for five seconds;
  Shield charges never stack.
- Different effect types may be active concurrently; each duration or use count is tracked and
  consumed independently.
- A life-saving respawn clears all temporary powerup effects, keeps any uncollected non-conflicting
  board powerup, and resumes play automatically with the normal starting direction and current pace.
- P, Space, and the existing pause button retain their pause/resume behavior. Pausing through those
  controls does not open the shop; resuming by any control closes it.
- Malformed, unaffordable, wrong-status, and over-cap purchase requests cannot spend points or
  partially mutate the run.
- Powerup placement and respawn placement cannot create duplicate snake cells or overlap food.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every new run MUST begin at level 1 with 0 cumulative XP, 0 unspent perk points,
  Luck level 0, Extra XP level 0, 0 life charges, no active effect, and no board powerup.
- **FR-002**: A normal food pickup MUST award 10 XP plus 2 XP per purchased Extra XP level.
- **FR-003**: Double Food MUST multiply the complete XP award from FR-002 by two and MUST multiply
  the configured score award by two; it MUST NOT multiply growth beyond one segment.
- **FR-004**: Reaching level `n + 1` MUST require `50 × n` XP earned since reaching level `n`.
  Cumulative XP thresholds therefore begin at 50 for level 2, 150 for level 3, 300 for level 4,
  and continue as the sum of all prior per-level requirements.
- **FR-005**: Every crossed level MUST grant exactly one perk point, including every level crossed by
  a single XP award.
- **FR-006**: Luck and Extra XP MUST each have levels 0 through 5 and MUST cost 1, 2, 3, 4, and 5
  points for purchased levels 1 through 5 respectively.
- **FR-007**: Each Luck level MUST add 5 percentage points to a base 5% powerup spawn chance, for a
  maximum 30% chance at level 5.
- **FR-008**: +1 Life MUST add one held charge, with a maximum of two. A purchase MUST cost 5 points
  when zero charges are held and 8 points when one charge is held.
- **FR-009**: A perk purchase MUST take effect immediately and atomically deduct only its exact cost.
  There MUST be no refund, decrement, resale, or partial-purchase operation.
- **FR-010**: Purchases MUST be accepted only while the run is paused. Invalid perk names, extra
  fields, malformed values, insufficient funds, caps, and wrong run status MUST be rejected without
  any authoritative state or revision change.
- **FR-011**: Pressing S or activating a visible SHOP control during play MUST pause the run and show
  the shop. Pressing S or activating SHOP while paused MUST show or hide the shop without resuming.
  A visible Resume action MUST resume play. These controls MUST remain keyboard and touch accessible.
- **FR-012**: The shop MUST display unspent perk points and, for every perk, its current level or held
  charges, cap, next cost when purchasable, and a plus-only purchase control.
- **FR-013**: The playing HUD MUST display XP, level, unspent perk points, Luck and Extra XP levels as
  filled/empty cubes with numeric values, and held lives as filled/empty cubes with a numeric value.
- **FR-014**: At most one uncollected powerup MUST exist on the board. A spawn attempt MUST occur only
  immediately after food is eaten and only when no uncollected powerup exists.
- **FR-015**: A successful spawn MUST select Speed Boost, Shield, or Double Food with equal
  probability and place it uniformly on a cell free of snake, food, and powerup occupancy.
- **FR-016**: If no eligible powerup cell exists, the spawn attempt MUST safely produce no powerup.
- **FR-017**: Speed Boost MUST reduce movement intervals by 25% for five seconds of active play,
  applying after existing score-based pace calculation and allowing a minimum effective interval of
  60 ms when the normal minimum is 80 ms.
- **FR-018**: Shield MUST remain eligible for five seconds of active play and cancel exactly one wall
  or self collision by consuming the Shield, canceling the attempted move, retaining the last safe
  snake position, and keeping the run in play.
- **FR-019**: Double Food MUST apply to exactly the next three food pickups. Its counter MUST not be
  consumed by movement, powerup collection, pause time, or a Shield-canceled collision. A life
  respawn clears it with the other temporary effects under FR-023.
- **FR-020**: Collecting an already active timed powerup type MUST refresh its remaining duration to
  five seconds without stacking its magnitude or collision count. Collecting Double Food while it is
  already active MUST reset its remaining-use count to three rather than accumulating uses.
- **FR-021**: Timed powerup duration MUST advance only during active play and MUST freeze throughout
  pause, regardless of whether the shop is shown.
- **FR-022**: Shield MUST take precedence over life charges on collision. A life MUST be consumed only
  when no active Shield can cancel that collision.
- **FR-023**: Consuming a life MUST respawn a valid three-segment snake at the standard starting
  position and direction, continue the run automatically, retain score and progression/permanent
  perk state, and clear temporary effects.
- **FR-024**: Life respawn MUST resolve any food or board-powerup overlap with the respawn formation
  before the next movement tick without awarding score, XP, or a pickup.
- **FR-025**: Restarting or creating a new run MUST reset every value listed in FR-001 while preserving
  the existing game container/player identity behavior for restart.
- **FR-026**: The authoritative snapshot MUST contain all state needed to render progression, perk
  levels, held lives, board powerup, and active-effect status, and consumers MUST reject malformed,
  unknown, out-of-range, internally inconsistent, or incomplete snapshot data.
- **FR-027**: The browser MUST render validated authoritative snapshots and submit only player intent;
  it MUST NOT calculate awards, purchase results, random spawns, collision recovery, effect expiry,
  or authoritative pause state.
- **FR-028**: Random spawn rolls, type choice, cell placement, and active-time progression MUST be
  controllable for deterministic acceptance tests.
- **FR-029**: Existing direction controls, score/growth rules outside declared modifiers, pause and
  restart controls, win condition, local best score, independent game containers, and the read-only
  Hint behavior MUST continue to work.
- **FR-030**: The Hint input and tool contract MUST remain unchanged; progression, perks, powerups,
  and lives MUST NOT be exposed through or mutated by the Hint flow.

### Key Entities

- **Run Progression**: Cumulative XP, derived level, unspent perk points, and the awards that update
  them for one run.
- **Perk Loadout**: Luck level, Extra XP level, and held life charges, including caps and next costs.
- **Board Powerup**: One optional collectible with a type and unoccupied board position.
- **Active Effects**: Remaining active-play duration for Speed Boost or Shield and remaining food
  pickups for Double Food.
- **Purchase Intent**: A request naming exactly one permitted perk; it succeeds atomically or leaves
  the run unchanged.
- **Authoritative Game Snapshot**: The complete renderable view of one game container, one player,
  board state, run progression, perks, and effect state at a revision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In deterministic progression scenarios, 100% of XP awards produce the specified
  cumulative XP, level, and perk-point totals at, below, above, and across multiple thresholds.
- **SC-002**: A player can pause with S, identify every current perk value and next cost, complete one
  affordable purchase, and resume in no more than four deliberate controls.
- **SC-003**: Across valid, unaffordable, capped, malformed, and wrong-status purchase
  scenarios, 100% of invalid attempts leave all run state and its revision unchanged.
- **SC-004**: In controlled spawn trials for Luck levels 0 through 5, the configured boundary values
  correspond exactly to 5%, 10%, 15%, 20%, 25%, and 30%, and every spawned item occupies an eligible
  cell.
- **SC-005**: Each powerup passes deterministic start, active, pause, refresh, consume/expire, and
  restart scenarios with no extra score, XP, growth, duration, or uses.
- **SC-006**: Every collision matrix case—no defense, Shield, life, and both—produces exactly one
  specified outcome without duplicate consumption or an unsafe snake position.
- **SC-007**: 100% of malformed or inconsistent feature snapshots are rejected and the last valid
  display remains usable until another valid authoritative snapshot arrives.
- **SC-008**: All existing core Snake, server-container, client contract, and read-only Hint regression
  scenarios continue to pass after the feature is implemented.

## Assumptions

- The prompt's suggested values are accepted for this version: one board powerup maximum, equal type
  odds, and +1 Life prices of 5 and 8 points.
- “25% faster” means a 25% reduction in the already-calculated movement interval; the normal 80 ms
  minimum therefore becomes 60 ms only while Speed Boost is active.
- Timed effects use active-play time rather than wall-clock time, so a pause is never strategically
  penalizing.
- Timed effects refresh rather than stack. A later Double Food collection replaces its remaining-use
  count with three rather than accumulating uses.
- Shop visibility is presentation state; pause state, purchase validity, and every gameplay value are
  authoritative. Hiding the shop does not resume play.
- The visible SHOP control is the touch-accessible equivalent of S; it adds no separate server action.
- The game remains one player per in-memory container with no persistence between server restarts.
- No accounts, database, online currency, selectable loadouts, new game modes, live AI/provider,
  additional AI tools, third-party assets, audio, room/join flow, or multiplayer play is included.
