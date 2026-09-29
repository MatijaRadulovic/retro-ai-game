# RETRO SNAKE — Game Specification

## Identity

RETRO SNAKE je originalna igra sa retro izgledom i bez tuđih asseta, muzike ili logotipa. Vite browser klijent prikazuje igru; TypeScript Node backend poseduje autoritativno stanje i može da hostuje više nezavisnih single-player game containera. Svaki container trenutno ima jednog igrača. Igrač vodi zmiju po mreži, skuplja hranu i pokušava da izdrži što duže bez udara u zid ili telo. Partija počinje tek posle prvog validnog smera. AI Hint je read-only, korisnički pokrenut tok koji poziva Gemini isključivo sa backend-a; pri nedostupnosti vraća bezbedan lokalni fallback.

## Core rules

- Tabla je mreža 20 × 20 polja.
- Zmija počinje sa tri segmenta, spremna da krene desno, ali čeka prvi važeći pritisak strelice.
- Strelice na tastaturi pokreću igru i menjaju smer.
- Suprotan smer od trenutnog/zakazanog smera se ignoriše.
- Hrana se bira samo sa praznih polja.
- Jedenje hrane povećava zmiju za jedan segment i rezultat za 1.
- Svakih 5 poena igra se ubrzava za 12 ms, do minimalnih 80 ms po koraku.
- Udarac u zid ili telo završava igru.
- Kada je cela tabla popunjena, igra prelazi u stanje `won`.
- `P`, `Space` ili dugme `PAUSE` pauziraju i nastavljaju igru; dodirom su dostupna četiri smerna dugmeta na manjim ekranima.
- `NEW GAME`, overlay dugme ili `R` vraćaju početnu zmiju, rezultat i hranu u stanje `ready`.
- Najbolji rezultat se čuva lokalno u browseru; nema naloga, baze ni online tabele.

## Client/server boundary

- Server owns validated game configuration, game containers, player state, transitions, tick timing, and snapshots.
- Browser sends intended actions and renders validated snapshots received from the server. It does not advance game timers or mutate authoritative state.
- HTTP API creates and reads games and accepts direction, pause, resume, and restart actions. WebSocket broadcasts current snapshots to connected clients.
- Game containers are in-memory and may run independently on one server. A container has shared game state and a `players` collection; each player owns its snake, direction, and score. There is exactly one player per container in this version, with no room creation/join endpoints or multiplayer UI.
- The Hint endpoint derives a sanitized read-only snapshot from authoritative server state and sends only that bounded snapshot to the server-side Gemini adapter. The browser never calls Gemini or receives the API key.
- The Hint request is asynchronous, has a finite deadline and bounded retry policy, and is independent of the game tick. Failure, missing configuration, or invalid provider output never blocks or changes the game.
- Architecture steps, scope, and task validation are tracked in [`REFACTOR_PLAN.md`](REFACTOR_PLAN.md).

### HTTP and WebSocket contract

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/health` | Return `{ "status": "ok" }`. |
| `POST` | `/api/games` | Create a ready game container with one player; accepts an optional `config`. |
| `GET` | `/api/games/:gameId` | Return the current authoritative `{ "game": snapshot }`. |
| `POST` | `/api/games/:gameId/move` | Accept `{ "direction": "up" | "right" | "down" | "left" }`; the first valid move starts the game. |
| `POST` | `/api/games/:gameId/pause` | Pause a playing game. |
| `POST` | `/api/games/:gameId/resume` | Resume a paused game. |
| `POST` | `/api/games/:gameId/restart` | Reset the game while retaining its container and player IDs. |
| `POST` | `/api/games/:gameId/hint` | Request one read-only AI Hint; response contract and provider failure policy are in [`TOOL_CONTRACT.md`](TOOL_CONTRACT.md). |
| WebSocket | `/api/games/:gameId/events` | Send an initial `{ "type": "snapshot", "game": snapshot }` and later snapshots after transitions and ticks. This connection accepts no commands. |

Errors use `{ "error": { "code": string, "message": string } }`. Invalid requests return HTTP 400, missing routes/sessions return 404, and actions invalid for the current game status return 409. Invalid config uses the existing safe default and includes `configError` in the snapshot.

## Runtime configuration

```ts
type GameConfig = {
  gridSize: number;
  startingSnakeLength: number;
  startingSpeedMs: number;
  speedIncreaseEvery: number;
  speedDecreaseMs: number;
  minimumSpeedMs: number;
  scorePerFood: number;
};
```

Podrazumevana konfiguracija je `{ gridSize: 20, startingSnakeLength: 3, startingSpeedMs: 160, speedIncreaseEvery: 5, speedDecreaseMs: 12, minimumSpeedMs: 80, scorePerFood: 1 }`. `parseGameConfig` proverava konfiguraciju u runtime-u. Nevažeća vrednost vraća bezbedan fallback i poruku greške; aplikacija ne nastavlja neopaženo sa nepoznatim vrednostima.

## Minimal visual requirement

Tamna pozadina, jasna mreža, kontrastna zelena zmija i crvena hrana moraju ostati čitljivi i na malom ekranu. HUD prikazuje rezultat, lokalni rekord, tempo i stanje igre. AI Hint je mali tekstualni panel; njegov izlaz nije komanda za igru.

## Definition of Done

- Igra radi lokalno kroz postojeći Vite/TypeScript stack.
- Tastatura i mobilna smerna dugmad kontrolišu smer; suprotan smer se odbija.
- Hrana se ne pojavljuje na zmiji, rezultat i dužina rastu, a sudari završavaju partiju.
- Pause, restart, and local best score work through the client/server app; local best score remains in browser storage.
- `GameConfig` i AI Hint ulazi/izlazi imaju runtime validaciju i bezbedan fallback ili grešku.
- Postoje testovi za core logiku i success, negative i failure AI Hint putanje.
- Gemini credentials are server-only; browser bundles, public DTOs, logs, prompts, tests, screenshots, and tracking records contain no credential. The pre-push guard scans outgoing commits and client build/source surfaces without opening secret files.
- The Hint uses bounded asynchronous Gemini calls, runtime output validation, safe errors, and local fallback. The game remains playable if Gemini is not configured or available.
- No AI write tool or automatic AI-driven game mutation is present.

## Out of scope

Room creation/joining, multiple players in one game, multiplayer UI, login/authentication, database, online leaderboard, deployment, levels, sound, AI opponent, additional AI providers/models, browser-selected model/provider, additional AI tools, write tools, autonomous loops, and any game mutation through AI Hint. Lives, powerups, breakable walls, obstacles, and selectable map layouts are also out of scope for this refactor.
