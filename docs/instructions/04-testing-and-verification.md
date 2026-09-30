# Testing and Verification

Read this module for code, test, evaluation, or behavior-review work.

## Required project checks

For implementation changes run all three commands from the repository root:

```sh
npm run typecheck
npm test
npm run build
```

`npm test` also runs typecheck. Keep the separate typecheck command because it is an explicit project gate. Record actual outputs and exit status in the appropriate evidence record. Do not claim a check passed if it was skipped or failed. For documentation-only changes, code checks may be skipped; record that reason in the work log.

## Build and run locally

Use Node.js 22 or newer.

For development, run the client and backend in separate terminals from the repository root:

```sh
npm install
npm run dev
```

```sh
npm run dev:server
```

Open the Vite URL printed in the client terminal (default `http://localhost:5173`).

To build and run the built client locally:

```sh
npm run build
```

Then run the backend and preview in separate terminals:

```sh
npm start
```

```sh
npm run preview
```

Open the preview URL (default `http://localhost:4173`). The Vite preview proxy forwards `/api` HTTP and WebSocket traffic to the backend on port 3001. `npm run build` typechecks the project and creates frontend assets in `dist/`; it does not start either process.

## Test expectations

- Add or update focused tests for changed behavior. Do not weaken or remove tests to make them pass.
- Cover a meaningful success case and relevant invalid, boundary, or failure cases.
- Keep game logic deterministic in tests. Use controlled fixtures rather than live services or variable external state.
- For runtime contracts, test malformed and unsupported input/output, not only valid TypeScript objects.
- For shop AI advice, prove invalid/non-paused requests make zero provider calls, structured output is legal for the current points/caps/revision, transient retries and model fallback obey exact attempt limits, terminal failures stop, and game state is unchanged.
- For configuration, check invalid values produce the documented safe fallback and visible error.

## Task-specific evals and evidence

- Keep evaluation cases with the task evidence that owns them: core-game baseline and frozen regression cases in `tracking/evidence/EVIDENCE_003.md`; historical movement-Hint cases in `tracking/evidence/EVIDENCE_004.md`; server-refactor cases in `tracking/evidence/EVIDENCE_005.md`; current shop-advice cases in `tracking/evidence/EVIDENCE_009.md`. New substantial tasks should use a focused evidence record rather than a permanent global eval list.
- Start new evidence records from `tracking/evidence/EVIDENCE_TEMPLATE.md` so baseline, scenario expectations, iterations, actual outcomes, and limitations use a consistent structure.
- Preserve the baseline and rerun the same frozen cases across each controlled change. Do not silently change expected results to match implementation. If no baseline was captured, mark it missing; do not infer it from the after run.
- Distinguish unit/test output from manual browser observations. Say exactly what each check establishes and what remains unverified.
- Preserve actual command output in the corresponding task evidence file under `tracking/evidence/`. Do not fabricate screenshots, results, or measurements.
