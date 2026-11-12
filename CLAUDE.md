# CatCHMeal mobile

Personal, local, single-user Android nutrition and training tracker (Samsung Galaxy S21+). No server, no account: the phone holds the data in SQLite. Solo project, committed straight on `main`, no branches, no PRs.

User docs: README.md. Build, commands, commit format, releases, data model: CONTRIBUTING.md. Detailed architecture: docs/architecture.md (read it before a structural change or a new feature). Interface work: the `catchmeal-ui` skill.

## Stack

React 19, TypeScript 6, Vite 8, Tailwind 4, react-router 8, Capacitor 8 (Android), `@capacitor-community/sqlite` 8, Vitest 5 with Node's `node:sqlite` (Node 22.5+), ESLint 9 type-checked, Prettier 3, knip. JDK 21, Android SDK 36.

## Commands

- `make check`: format check, lint, `tsc -b` + build, tests (same as CI)
- `make format` / `make lint`: fix formatting / fixable lint
- `npx vitest run src/data/meals.test.ts`: one test file
- `make knip`: unused files, exports and dependencies (before a release)
- `make phone`: build and install "CatCHMeal dev" (`io.github.natamun.catchmeal.debug`)
- `make release` then `make installRelease`: the real app, signed (see the `/release` skill)
- Phone over USB from WSL: `usbipd.exe attach --wsl --busid <BUSID> --auto-attach`, then `adb devices`

## Map

```
src/main.tsx            startup: open DB, run migrations, render
src/App.tsx             routes (react-router); tab routes render null
src/db/                 database queue, transactions, Capacitor driver, migrations.ts (PRAGMA user_version)
src/data/<feature>.ts   business rules + SQL, pure, each with a .test.ts on real SQLite
src/data/changes.ts     change bus: changing() / notifyDataChanged()
src/components/<feat>/  screens' pieces; api.ts = UI entry to src/data (wraps changing())
src/components/layout/  AppLayout (swipeable tabs, always mounted), Nav, FlowLayer, FlowHeader, FlowFooter
src/components/ui/      shared UI pieces (BaseDialog, Input, FieldError, Toast, PillTabs...)
src/components/theme/   the 12 colour themes; tokens live in src/index.css
src/pages/              one file per tab or flow page (Home, Food, Fitness, Stats, Profile, *Add, *Edit, Meal, Recipe)
src/hooks/              useDataVersion, useList, useDailyMeals, useDashboard, useTraining, useSwipeTabs
src/routing/            PATHS constants, useGoBack, journal and recipe routes
src/native/             Android-only: back button, native HTTP, backup file, share, reminders, barcode scanner
src/test/nodeDatabase.ts  real in-memory SQLite for tests
android/                Capacitor Android project (debug suffix .debug, signing from .password + .jks)
```

## How a feature is built

1. Data first: a new migration appended to `src/db/migrations.ts` (never edit a shipped one), the module in `src/data`, its tests (valid case and every refusal).
2. Then `components/<feature>/api.ts`, then the screens (with the `catchmeal-ui` skill).
3. If the backup must carry the new data, update `src/data/backup.ts` and its test.

## Conventions the code does not show

- Say "repas loggé" (journal) or "repas de bibliothèque" (template), never just "un repas".
- Every validation or business rule gets a test that it is refused, and the test must fail without the rule.
- Comments: JSDoc in English on shared exports and each file's main component; `//` only for a surprising decision. Comment-only changes are `docs:` commits.
- SQLite plugin traps: a failed COMMIT leaves the transaction open until restart, so a rule must make its own statement fail (no `PRAGMA defer_foreign_keys`); the plugin turns DELETE into soft deletes on tables with `last_modified`/`sql_deleted`, splits scripts on ";\n" and strips `--` comments.

## Working rules

- Once the user said go, work autonomously: installs, builds, `make phone`, code. `sudo` is allowed; the user types the password, never store it.
- Verify behaviour by running it (tests, a script). Never drive the dev app yourself: only `ui-inspector` does, for an interface review. Otherwise hand the user a short list of what to try on the phone.
- Run checks silently; only mention a failure you could not fix, or a check you could not run.
- Commits: Claude runs `git add` + `git commit`, one logical change each, CONTRIBUTING format, one line, no body. An interface change the user checks on the phone is committed only once they validate it; until then it stays in the working tree, kept apart so each change becomes its own commit. A change the user sees adds its line under `## [Unreleased]` in CHANGELOG.md, in the same commit. Never push, tag, or touch GitHub: the user pushes last.
- Fixes to unpushed commits go into their original commit (`/fold-fixes`), not into a `fix:` commit.
- The real app (`io.github.natamun.catchmeal`) is updated only after the user's go (`/release`).

## Never

- Change the appId `io.github.natamun.catchmeal` (it would make another app).
- Run `git clean -fdx`: it deletes the release key and its password, which git ignores.
- Write the dev app's backup to Documents (it could overwrite the real app's backup).

## Delegation

- After a code change, before handing over: the `verifier` subagent runs the checks.
- Building or installing on the phone, building a release, checking its signature: `android-builder`.
- Looking at the dev app's screens for an interface review: `ui-inspector`.
- Updating README, CONTRIBUTING, CHANGELOG, docs/architecture.md after a feature: `doc-writer`.
- Finding where something lives when it needs more than 2 or 3 searches: the built-in `Explore` subagent.
- Keep design, data modelling, debugging and history rewriting in the main conversation.

## Upkeep

If you change the project structure (a folder, a layer, a pattern), update the Map above and docs/architecture.md in the same commit.
