# BUILD_PROMPT_HINTS-MOCK — Controlled Read-only AI Hint

Dodaj samo lokalni demonstracioni AI Hint tok na postojeću Retro Snake igru. Model-simulator sme da predloži isključivo `get_game_state` sa argumentom `{ detail: "summary" | "tactical" }`. Aplikacija mora proveriti naziv, argumente i allowlist pre izvršenja. Alat je read-only, vraća sanitizovan snapshot bez browser podataka, tajni, izvornog koda ili mogućnosti da promeni rezultat, zmiju, hranu, konfiguraciju ili partiju.

Zatim validiraj output alata i striktan `HintResponse`. Za invalidan zahtev, nepodržan alat, neispravan output, malformed finalni odgovor i provider failure prikaži bezbednu poruku, bez lažnog success-a. Koristi fake/mock putanju; ne uvodi live provider, API ključ ni mrežni poziv. Dodaj testove koji pokazuju call count i negative/failure putanje.
