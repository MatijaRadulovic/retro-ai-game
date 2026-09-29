# Tool Contract — `get_game_state`

## Purpose

Vraća mali, sanitizovan snapshot tekuće Snake partije isključivo za server-side Gemini Hint tok.

## Read/write i caller

- **Read/write:** strogo READ ONLY.
- **Dozvoljeni caller:** samo backend Hint service za zahtev koji je pokrenuo korisnik.
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

Alat nikada ne vraća secrets, environment promenljive, source code, `localStorage`, kompletno telo zmije, druge aplikacione podatke ili privatne podatke. Samo sanitizovani snapshot sme biti poslat Gemini-ju. Ne sme menjati score, smer, zmiju, hranu, konfiguraciju, timer ili restartovati partiju. Gemini ključ se ne prosleđuje ovoj funkciji niti bilo kom browser DTO-u.

## Failure policy

Ako ulaz nije validan ili game session ne postoji, Gemini se ne poziva. Ako output snapshot-a ili `HintResponse` nije validan, UI prikazuje bezbednu lokalnu poruku i ne prikazuje odgovor kao uspešan savet. Timeout, provider failure ili nedostajuća konfiguracija poštuju bounded retry politiku i zatim prikazuju lokalni fallback.

## Gemini request lifecycle

- Poziv je asinhron i van game tick loop-a. UI prikazuje čekanje i ostaje upotrebljiv.
- Jedna logička interakcija ima najviše dva Gemini pokušaja ukupno (početni pokušaj i jedan retry) i ukupan rok od 8 sekundi. Predloženi rok po pokušaju je do 3.5 sekunde; backoff je kratak i sa jitter-om. Svi rokovi su server-side konfiguracija sa bezbednim granicama.
- Retry je dozvoljen samo za timeout/transport, 429 ili transient 5xx, i samo ako ukupni deadline dozvoljava pokušaj. Poštuj `Retry-After` samo ako staje u preostali budžet.
- Ne retry-uj auth/config, 400/invalid request, refusal/safety, cancellation, prazan odgovor, schema-invalid ili semantički neispravan output. Nema drugog providera kao fallback-a.
- Po iscrpljenju dozvoljenih pokušaja vrati jasno označen lokalni fallback/unavailable rezultat; nikad ne predstavljaj ga kao Gemini uspeh.
- Javni odgovor je normalizovan i ne uključuje provider raw error, prompt, tajnu, stack trace ili privatni telemetry.

## Final response contract

```ts
type HintResponse = {
  hint: string; // 4–180 znakova
  suggestedAction: "move_up" | "move_right" | "move_down" | "move_left" | "avoid" | "collect" | "wait";
  urgency: "low" | "medium" | "high";
};
```
