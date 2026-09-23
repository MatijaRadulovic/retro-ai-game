# BUILD_PROMPT_V1 — Retro Snake

## Uloga

Ti si pažljiv AI coding agent koji radi na maloj browser igri. Napravi minimalnu, proverljivu Snake igru u postojećem projektu, bez širenja scope-a.

## Pre implementacije

1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko malih koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Pregledaj postojeću strukturu projekta, README i dostupne komande.
5. Ne menjaj kod dok ne predstaviš plan.
6. Ne proširuj scope bez eksplicitnog razloga i odobrenja.

## Cilj i pravila

Napravi retro-inspired Snake igru u browseru. Tabla je 20 × 20. Zmija počinje sa tri segmenta i početnim smerom desno. Strelice kontrolišu zmiju, ali suprotan smer se odbija. Hrana se stvara van tela, povećava rezultat i dužinu, a udar u zid ili telo završava partiju. UI prikazuje rezultat, stanje i `Restart`.

## Tehnički ugovor

Prati postojeći TypeScript/Vite stack i ne uvodi biblioteku samo zbog validacije. Dodaj `GameConfig` sa runtime proverom. Nevalidna konfiguracija mora dati jasnu grešku ili eksplicitni bezbedni fallback. Dodaj makar jedan proverljiv scenario za ključnu logiku.

## Granica

Dozvoljeni su samo prikaz igre, snake logika, stilovi, konfiguracija/validacija, minimalni testovi i potrebna dokumentacija. Nisu dozvoljeni multiplayer, login, backend, deployment, zvuk, asseti trećih strana, AI protivnik, AI Hint, API pozivi ili tool calling u ovoj prvoj verziji.

## Definition of Done i provere

Pre završetka pokreni postojeće typecheck, test i build komande. Ručno proveri početak kretanja, promenu smera, hranu, rast rezultata, sudar i restart. Pregledaj diff i prijavi stvarne rezultate i ograničenja.
