# RETRO SNAKE — Game Specification

## Identity

RETRO SNAKE je originalna minimalna browser igra sa retro izgledom i bez tuđih asseta, muzike, logotipa ili backend-a. Igrač vodi zmiju po mreži, skuplja hranu i pokušava da izdrži što duže bez udara u zid ili telo. Partija počinje tek posle prvog validnog smera, pa je početno stanje proverljivo i ne gubi se pre reakcije igrača. Lokalni AI Hint je demonstracioni, read-only tok: ne menja igru, ne koristi mrežu i ne poziva pravi AI servis.

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
- Pauza, restart i lokalni rekord rade bez mreže.
- `GameConfig` i AI Hint ulazi/izlazi imaju runtime validaciju i bezbedan fallback ili grešku.
- Postoje testovi za core logiku i success, negative i failure AI Hint putanje.
- Nema tajni, API poziva, write alata, backend-a ni automatskog menjanja stanja igre.

## Out of scope

Multiplayer, login, baza, online leaderboard, backend, deployment, nivoi, zvuk, AI protivnik, live AI provider, API ključevi, više alata, write alati, autonomna petlja i bilo kakvo menjanje igre kroz AI Hint.
