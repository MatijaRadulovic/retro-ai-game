# Tool Contract — `get_game_state`

## Purpose

Vraća mali, sanitizovan snapshot tekuće Snake partije isključivo za lokalni AI Hint tok.

## Read/write i caller

- **Read/write:** strogo READ ONLY.
- **Dozvoljeni caller:** samo `runHintFlow` u AI Hint UI toku.
- **Allowlist:** jedino ime `get_game_state`.

## Input

```ts
{ detail: "summary" | "tactical" }
```

Svako drugo ime, dodatno polje ili vrednost — na primer `{ detail: "everything", executeCode: "..." }` — odbija se pre izvršenja alata.

## Output

```ts
type GameStateSnapshot = {
  score: number;
  status: "ready" | "playing" | "paused" | "game_over" | "won";
  gridSize: number;
  direction: "up" | "right" | "down" | "left";
  snakeHead: { x: number; y: number };
  food: { x: number; y: number } | null;
  nearbyObjects: Array<{ type: "food" | "wall"; direction: "up" | "right" | "down" | "left" }>;
};
```

`summary` ne dodaje taktičke objekte; `tactical` sme dodati samo smer hrane i neposrednog zida.

## Must not return / do

Alat nikada ne vraća secrets, environment promenljive, source code, `localStorage`, kompletno telo zmije, druge aplikacione podatke ili privatne podatke. Ne sme menjati score, smer, zmiju, hranu, konfiguraciju, timer ili restartovati partiju.

## Failure policy

Ako predlog nije validan, alat se ne poziva. Ako output alata ili `HintResponse` nije validan, UI prikazuje definisanu bezbednu grešku i ne prikazuje savet. Provider failure se takođe prikazuje kao bezbedna lokalna poruka.

## Final response contract

```ts
type HintResponse = {
  hint: string; // 4–180 znakova
  suggestedAction: "move_up" | "move_right" | "move_down" | "move_left" | "avoid" | "collect" | "wait";
  urgency: "low" | "medium" | "high";
};
```
