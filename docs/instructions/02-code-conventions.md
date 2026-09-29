# Code Conventions

Read this module for implementation changes. Follow nearby code and existing project structure before introducing a new pattern.

- Use TypeScript and the existing Vite toolchain. Avoid adding dependencies unless the requested behavior requires one and the project owner accepts that scope.
- Prefer small, named functions and explicit result/error paths over hidden side effects or broad catch-all behavior.
- Keep rendering separate from game state transitions. Avoid duplicated sources of truth for score, direction, snake, food, and status.
- Validate untrusted runtime data at the boundary. Do not use a type assertion as a substitute for parsing/validation.
- Keep UI messages user-readable and accessible. Do not encode arbitrary AI text as an executable game command.
- Keep changes focused on the accepted task. Do not silently add a feature, dependency, framework, or unrelated cleanup.
- Match the repository's existing formatting, naming, and test conventions instead of introducing a competing style.

For game architecture and permitted AI behavior, see [`01-project-architecture.md`](01-project-architecture.md) and [`03-ai-hint-and-security.md`](03-ai-hint-and-security.md).
