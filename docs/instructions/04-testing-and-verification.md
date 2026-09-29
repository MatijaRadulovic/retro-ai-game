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

## Test expectations

- Add or update focused tests for changed behavior. Do not weaken or remove tests to make them pass.
- Cover a meaningful success case and relevant invalid, boundary, or failure cases.
- Keep game logic deterministic in tests. Use controlled fixtures rather than live services or variable external state.
- For runtime contracts, test malformed and unsupported input/output, not only valid TypeScript objects.
- For the AI Hint, prove rejected proposals do not invoke the tool (`callCount === 0`), success invokes only the permitted tool, failures show a safe fallback, and game state is unchanged.
- For configuration, check invalid values produce the documented safe fallback and visible error.

## Task-specific evals and evidence

- Keep evaluation cases with the task evidence that owns them: core-game cases and baseline history in `tracking/evidence/EVIDENCE_003.md`; Hint-specific cases in `tracking/evidence/EVIDENCE_004.md`. New substantial tasks should use a focused evidence record rather than a permanent global eval list.
- Preserve the relevant baseline and rerun the same cases across a controlled change. Do not silently change expected results to match implementation.
- Distinguish unit/test output from manual browser observations. Say exactly what each check establishes and what remains unverified.
- Preserve actual command output in the corresponding task evidence file under `tracking/evidence/`. Do not fabricate screenshots, results, or measurements.
