# Roadmap Workflow

This workflow keeps the Gwynne Park Run Club roadmap clear enough that we can tell what is finished, what is next, and what is deliberately waiting for the right moment.

## Status Labels

- `Done`: Built, tested, and pushed.
- `In Progress`: Actively being built in the current work block.
- `Ready Next`: Clear enough to start next without more planning.
- `Planned`: Agreed feature, but not the next thing to build.
- `Blocked`: Cannot move forward until a decision, account, service, or dependency is available.
- `Parked`: Useful idea, intentionally deferred.
- `Go-Live Gate`: Must be completed before real student data is entered.

## Priority Rules

- `Priority 0` is reserved for privacy, security, data ownership, and production readiness. It can be planned now, but most implementation should happen after the product shape is stable and before live student data is entered.
- `Priority 1` is the operational MVP. This is complete and should stay stable unless a bug is found.
- `Priority 2` is the next build lane. These items improve day-to-day usefulness without requiring the full production backend first, unless noted.
- `Priority 3` is backend and sync. These items move the platform from single-browser demo storage to real multi-device use.
- `Priority 4` is reporting and admin power tools.
- `Priority 5` is parent/student experience.
- `Priority 6` is competitions and challenges.
- `Priority 7` is Sports Carnival and Cross Country.
- `Priority 8` is polish, onboarding, and long-term enhancements.

## Completion Rule

A roadmap item is only marked `Done` when:

1. The feature is implemented.
2. The relevant tests or manual checks have been run.
3. The feature is committed and pushed.
4. `FEATURES.md` is updated with the completed status.

## Change Control

When a new feature request comes in:

1. Add it to `FEATURES.md` under the correct priority.
2. Give it a status.
3. Add acceptance checks if it is more than a tiny UI change.
4. Move only one major item to `In Progress` at a time unless the work is clearly independent.
5. When a feature is completed, strike it through and keep it visible for history.

## Checkpoint Workflow

For larger features:

1. Confirm the target roadmap item.
2. Build only that item or sub-item.
3. Run verification.
4. Stop for review if the user requested stage-by-stage checking.
5. Push after approval or when the requested feature batch is complete.

## Source Of Truth

- `FEATURES.md`: Current roadmap and progress.
- `docs/run-club-build-brief.md`: Product brief and original scope.
- `docs/roadmap-workflow.md`: Tracking rules and status definitions.
