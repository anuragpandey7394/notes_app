# Project Instructions for Claude Code

## Source of truth

* Read `PROJECT_PLAN.md` before implementing features.
* Read and update `PROJECT_PROGRESS.md` at the start and end of each phase.
* Preserve all requirements in the plan. If a requirement is missing or ambiguous, ask rather than inventing a replacement.
* Inspect the existing repository before editing. Do not overwrite existing files blindly.

## Working style

* Implement incrementally, one phase at a time.
* Keep the app runnable and testable in the browser after each phase.
* Prioritize checking the actual UI and user flows. Run TypeScript/build checks when relevant.
* Keep automated tests focused on important persistence, version-history, and data-integrity logic. Avoid excessive test scaffolding.
* Never claim a command, test, build, or browser check passed unless it was actually run.
* Keep reports concise: what changed, the local URL, what to try, checks performed and their actual results, progress status, and the next step.
* Prefer simple, maintainable solutions. Avoid overengineering and unrelated refactors.
* Follow existing project conventions and dependencies where sensible. Add dependencies only when needed.

## MCP router and model-cost safety

* For coding tasks, use the available MCP router tools when available: call `route` first, then `execute_task`.
* Keep `approve_paid=false` by default.
* Never approve paid-model requests automatically or bypass approval or budget safeguards.
* If the router is unavailable, report that fact. Do not claim it was used.
* Never put API keys, tokens, or other secrets in source files, documentation, or commits. Use environment variables or an appropriate local secret store.
* Do not rotate accounts or keys to evade provider quotas. Handle rate-limit errors transparently; do not silently switch to paid inference.

## Progress tracking

* Use these statuses: `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, `COMPLETED`.
* Record implementation notes and verification results accurately.
* Mark a phase `COMPLETED` only when its acceptance criteria are implemented and relevant checks have actually been performed.
* Keep a short list of known issues and the next concrete action.
