# Architecture

How the app is put together, for whoever changes it. Building, commands, commit format, releases and the data model diagram are in [CONTRIBUTING.md](../CONTRIBUTING.md); this page does not repeat them.

## The layers

```
pages / components  ->  components/<feature>/api.ts  ->  src/data/<feature>.ts  ->  src/db  ->  SQLite
        ^                                                        |
        +---- hooks re-read <---- data/changes.ts (version) <----+  notifyDataChanged()
```

- **`src/db`**: knows nothing about features. `database.ts` defines the `Database` interface and a single queue: every statement runs one after the other, and `transaction()` wraps a function in BEGIN / COMMIT / ROLLBACK. `capacitorDatabase.ts` is the phone driver, `appDatabase.ts` the singleton `getDatabase()` that opens `catchmeal`, keeps the plugin's own transactions off and runs the migrations at startup (`main.tsx`).
- **`src/data`**: one module per feature (meals, foodItems, recipes, workouts, goals, weights, shopping, backup, stats, openFoodFacts...). Pure functions that take a `Database` and return plain objects; they hold the validation, the business rules and the SQL. No React here.
- **`components/<feature>/api.ts`**: the UI's door to `src/data`. Each function gets the database and wraps writes in `changing(...)`, which calls `notifyDataChanged()` once the write succeeds.
- **Hooks and screens**: read through `api.ts` inside a `useEffect` keyed on the data version, so every mounted screen re-reads after any write.

## State

There is no store library. Three mechanisms:

- **The change bus** (`data/changes.ts` + `hooks/useDataVersion.ts`): a version number bumped by `notifyDataChanged()`, read with `useSyncExternalStore`. Coarse but simple: any write refreshes every open screen.
- **Contexts**: `ProfileProvider` (loads the profile once and blocks the render until it is read), `ToastProvider`, the flow context of `FlowLayer`.
- **localStorage**, two keys only: the theme id (a startup copy of `profile.theme`, so the first frame has the right colours) and the chosen scanner camera.

`useList` is the generic "load a list, reload on version change, abort on unmount" hook. `useDailyMeals` adds a per-day cache and prefetches the days before and after.

## Screens and navigation

- `App.tsx` declares the routes. The 5 tabs (Home, Food, Fitness, Stats, Profile) have routes whose element is `null`: `components/layout/AppLayout.tsx` draws them itself as a swipeable carousel (`useSwipeTabs`). Tabs are lazy-loaded, stay mounted once shown, and off-screen tabs are `inert`; all are prepared 300 ms after start.
- Flow pages (journal add, training add, recipe view and edit, shopping add) render through `<Outlet>` inside `FlowLayer`, an overlay above the tabs, with `FlowHeader`.
- `routing/paths.ts` holds every path (`PATHS`); `routing/navigation.ts` has `useGoBack`. The Android back button is handled in `native/androidBackButton.ts`.

## Example: logging a meal

1. `/home/add/:mealType?date=` opens `JournalAddPage`, then `DailyMealPicker`, then `DailyMealReview` (or `QuickAddDialog`).
2. Saving calls `meal/api.ts` `createMeal`, which runs `changing(meals.createMeal(await getDatabase(), input))`.
3. `data/meals.ts` validates, then in one transaction computes each line's kcal and macros, inserts the meal and its lines, and reads the meal back.
4. `notifyDataChanged()` bumps the version; mounted hooks re-read, `useDailyMeals` clears its cache.
5. A toast shows and the flow closes.

## Database

- Migrations: an inline array in `db/migrations.ts`, versioned with `PRAGMA user_version`, one transaction per step (V1 to V13 today). Append a new step; never edit a shipped one, phones already ran it. `db/migrations.test.ts` checks the upgrade path.
- Tables are `STRICT` with `CHECK` constraints, so a bad value fails in SQLite too.
- Plugin traps (`@capacitor-community/sqlite` on Android): a COMMIT that fails leaves the transaction open in SQLite while the plugin forgets it, and every later transaction is refused until restart. So a rule must make its own statement fail before COMMIT (no deferred foreign keys). The plugin also rewrites DELETE into soft deletes when a table has `last_modified` / `sql_deleted`, splits scripts on ";\n" and strips `--` comments.
- Backup: `data/backup.ts` exports and restores every table in its own JSON format; a new table must be added there.

## Outside calls

- **Open Food Facts**: `data/openFoodFacts.ts` reads `world.openfoodfacts.org/api/v3.4/product/{barcode}` with an injected HTTP client. On the phone it is `native/nativeHttp.ts` (CapacitorHttp, 5 s timeouts), because a browser `fetch` cannot set the `User-Agent` OFF requires. Limit: 15 product reads per minute per IP.
- **"Ask an AI"**: no API call. `recipe/recipePrompt.ts` and `analytics/aiContext.ts` build a text prompt, copied with the Clipboard plugin or sent to Android's share sheet.
- Barcode scanning: `@yudiel/react-qr-scanner` with its own zxing wasm decoder (`zxing-wasm` pinned, bump both together); `food/scannerCamera.ts` picks a rear camera with continuous focus, since the S21+ may open a fixed-focus wide lens.

## Tests

- Colocated `*.test.ts`, about 590 tests in 37 files, default Node environment (no vitest config).
- `src/test/nodeDatabase.ts` wraps Node's `node:sqlite` (`:memory:`) in the same `createDatabase`, so `src/data` runs its real SQL in tests.
- Not tested: the Capacitor driver, most of `src/native`, the `api.ts` files, the hooks (except swipe), and no React component tests. UI is checked by hand on the phone.

## Dev app and real app

Same appId, split by build type in `android/app/build.gradle`: debug adds `.debug` and its own name ("CatCHMeal dev"), so both live side by side with separate data. `versionCode` comes from `package.json` (1.2.3 gives 10203). The release is signed only if `catchmeal-release.jks` and `.password` exist at the root (symlinks to OneDrive).

## Icon and splash

`src/assets/logo.svg` is the logo shown in the app; `assets/logo.svg` is a padded square copy (viewBox `-178.9 -24.2 1150 1150`) used to generate the Android icon and splash:

```
npx @capacitor/assets generate --android --iconBackgroundColor '#ffffff' --iconBackgroundColorDark '#ffffff' --splashBackgroundColor '#d8f3dc' --splashBackgroundColorDark '#d8f3dc'
```

Restore the `splash.png` files with git if only the icon should change.

## Known debt

- **Inverted imports**: `src/data` imports types and helpers from `components/*` (types, `profile/api`, `food/barcode`, `theme/themeList`), and some hooks import from components. Shared types should move down to `src/data` (or a `src/types`).
- **`api.ts` bypassed**: `useGoals` (profile), `MeasureChart`, `aiContext`, `BarcodeField`, `BackupCard` and `HomePage` call `src/data` directly, so a write made there must notify the change bus by itself.
- **Decimals handled in four places** (`data/validation.ts`, `utils/decimals.ts`, `meal/draft.ts`, `recipe/recipeForm.ts`) and two `validation` modules (`data/` and `utils/`).
- **Hooks split** between `src/hooks` and feature folders (`recipe/useRecipeEditor.ts`, `analytics/useChartTooltip.ts`).
- **Large files**: `analytics/aiContext.ts` (596 lines), `food/FoodItemForm.tsx` (538).
- **Possibly dead columns**: check whether `profile.lean_loss_alert` and `goal_type` are still read.
