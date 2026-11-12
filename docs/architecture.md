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
- **localStorage**, one key only: the theme id (a startup copy of `profile.theme`, so the first frame has the right colours).

`useList` is the generic "load a list, reload on version change, abort on unmount" hook. `useDailyMeals` adds a per-day cache and prefetches the days before and after.

## Screens and navigation

- `App.tsx` declares the routes. The 5 tabs (Home, Food, Fitness, Stats, Profile) have routes whose element is `null`: `components/layout/AppLayout.tsx` draws them itself as a swipeable carousel (`useSwipeTabs`). Tabs are lazy-loaded, stay mounted once shown, and off-screen tabs are `inert`; all are prepared 300 ms after start.
- Flow pages (journal add and edit, training add and edit, library meal, favorite session, recipe view and edit, shopping add) render through `<Outlet>` inside `FlowLayer`, an overlay above the tabs, with `FlowHeader`. Editing a section of the journal (`/home/edit/:mealType`), the session of a day (`/home/training/edit`, `TrainingDayReview`, with its exercises reordered by drag), a library meal (`/food/meal/:mealId`) or a favorite session (`/fitness/session/:templateId`, `TemplatePage` and `TemplateForm`, with its exercises reordered by drag) is a page, not a dialog. `FlowFooter` sticks the totals, an error and the save button to the bottom of such a page.
- `routing/paths.ts` holds every path (`PATHS`); `routing/navigation.ts` has `useGoBack`. The Android back button is handled in `native/androidBackButton.ts`.

## Shared UI pieces

In `components/ui/`:

- **`Card`**: the one card of the app (frame, padding, optional title and action, ruled header, `flush` for edge-to-edge lists). It replaces `ListCard`, `SummaryCard` and the recipe card.
- **`EditableList`**: the items of a meal or a session being edited, one line each (name, quantity, kcal). A tap opens a `BottomSheet` with the full name, a `ConfirmRemoveButton`, the live kcal and macros and the controls (stepper, sets). Rows have no trailing chevron, as in `ExerciseList`. The list itself never moves, unless `onMove` is given: then each row has a drag handle and reorders through `SortableList` (the session being logged, a favorite session). A screen can also pass its own rows (the recipe form's ingredients and sections).
- **`SortableList`**: drag-and-drop reordering built on `@dnd-kit`, by a handle so scrolling still works. It reports `(from, to)`; the caller owns the order and saves the positions. Used by `EditableList` and the recipe steps and ingredients.
- **`SheetSection`**: one part of a sheet or a dialog: a small accent title, an optional `info` (an `InfoBubble`) right after it, then the content. The title row keeps one height with or without a bubble. `htmlFor` makes the title a `<label>`. `SHEET_BODY_CLASS` is the column of sections, with one gap between them (also used by the editor sheet of `TrainingDayReview`). Used by the food, exercise and recipe sheets and forms.
- **`Textarea`**: the twin of `Input` for long text (the exercise note, the recipe fields and its import). It grows with its text up to a limit, then scrolls. Its border turns red when `data-invalid` is true.
- **`ExerciseGymSheet`** (`fitness/`): opened by a tap on an exercise of the journal's session card (`home/TrainingDayCard`). It shows the exercise's note (`ExerciseNotes`), its last time before that day and, for strength, its best set. The stats and curves stay in the fitness tab.
- **`ActionMenu`**: a ⋯ button that opens a bottom sheet of actions. `BaseDialog` uses it for its secondary actions, and the recipe page for duplicate and delete (delete lives on the read page, no longer on the edit page).
- **`StatTile`**: a small label and value tile, shared by the exercise sheet and the food sheet (`food/FoodSheet.tsx`, usage from `listFoodUsage` in `data/foodItems.ts`).
- **`MacroSearchBar`** and `macroFilter.ts`: search, macro filters and sort for the food, meal and recipe lists. `BY_FREQUENCY` sorts by how often an item was logged over the last 90 days; the bar offers it only when `canSortByFrequency` is true (the food lists of the Food tab and of the journal picker, which load `listFoodUsage`).
- **`ConfirmRemoveButton`**: a trash that asks twice. The first tap arms it as "Retirer ?", the second confirms, and it calms down after 3 s.
- **`SearchPicker`**: a field that opens a full-screen search of a library, in a native `<dialog>` fading in (so the Android back button closes it). The field is at the top and the results under it, out of the keyboard's way. A tap adds a result and the search stays open; items already added are checked and pulse on each pick. A caller can pass `countOf` to show a ×n counter (the recipe form uses it). It replaces `DropdownPanel`, and `@radix-ui/react-popover` is no longer a dependency.
- **`AiCard`**: the card shared by the stats and the recipe screens for the "Ask an AI" text: a button copies it or sends it to the share sheet. The text is passed as a function, built only on the tap.
- **`MacroSummary`** is built from `MacroBadges` (the three macros) and `KcalPill` (the calories), which can be used alone.

## Example: logging a meal

1. `/home/add/:mealType?date=` opens `JournalAddPage`, then `DailyMealPicker`, then `DailyMealReview` (or `QuickAddDialog`).
2. Saving calls `meal/api.ts` `createMeal`, which runs `changing(meals.createMeal(await getDatabase(), input))`.
3. `data/meals.ts` validates, then in one transaction computes each line's kcal and macros, inserts the meal and its lines, and reads the meal back.
4. `notifyDataChanged()` bumps the version; mounted hooks re-read, `useDailyMeals` clears its cache.
5. A toast shows and the flow closes.

## Database

- Migrations: an inline array in `db/migrations.ts`, versioned with `PRAGMA user_version`, one transaction per step (V1 to V15 today). Append a new step; never edit a shipped one, phones already ran it. `db/migrations.test.ts` checks the upgrade path.
- Tables are `STRICT` with `CHECK` constraints, so a bad value fails in SQLite too.
- Plugin traps (`@capacitor-community/sqlite` on Android): a COMMIT that fails leaves the transaction open in SQLite while the plugin forgets it, and every later transaction is refused until restart. So a rule must make its own statement fail before COMMIT (no deferred foreign keys). The plugin also rewrites DELETE into soft deletes when a table has `last_modified` / `sql_deleted`, splits scripts on ";\n" and strips `--` comments.
- Backup: `data/backup.ts` exports and restores every table in its own JSON format; a new table or column must be added there (format 11 today, with `exercise.notes`).

## Outside calls

- **Open Food Facts**: `data/openFoodFacts.ts` reads `world.openfoodfacts.org/api/v3.4/product/{barcode}` with an injected HTTP client. On the phone it is `native/nativeHttp.ts` (CapacitorHttp, 5 s timeouts), because a browser `fetch` cannot set the `User-Agent` OFF requires. Limit: 15 product reads per minute per IP.
- **"Ask an AI"**: no API call. `recipe/recipePrompt.ts` and `analytics/aiContext.ts` build a text prompt, copied with the Clipboard plugin or sent to Android's share sheet through `ui/AiCard`. The recipe prompt ends on the user's question, the goal being context only. A recipe can also come back from the AI: `recipe/recipeImport.ts` writes the recipe as JSON (`formToJson`, ingredients by their library id, each with its optional `section`) and `parseRecipeImport` reads the AI's answer, refusing unknown foods, bad quantities and servings. `RecipeImportCard` pastes it into the recipe form (a list of `IngredientLine`, each a food draft or a section title), which the user still saves.
- **Barcode scanning**: `native/barcodeScanner.ts` calls `@capacitor-mlkit/barcode-scanning`, which opens Google's full-screen scanner (EAN and UPC only). No camera permission is needed. The scanner module is downloaded by Google Play services (`barcode_ui` declared in the manifest); if it is missing, `ScannerNotReadyError` tells the user to retry. `hooks/useHasCamera` shows the scan button only when the phone supports it.

## Tests

- Colocated `*.test.ts`, about 640 tests in 40 files, default Node environment (no vitest config).
- `src/test/nodeDatabase.ts` wraps Node's `node:sqlite` (`:memory:`) in the same `createDatabase`, so `src/data` runs its real SQL in tests.
- Not tested: the Capacitor driver, most of `src/native`, the `api.ts` files, the hooks (except swipe), and no React component tests. UI is checked by hand on the phone.

## Dev app and real app

Same appId, split by build type in `android/app/build.gradle`: debug adds `.debug` and its own name ("CatCHMeal dev"), so both live side by side with separate data. `versionCode` comes from `package.json` (1.2.3 gives 10203). The release is signed only if `catchmeal-release.jks` and `.password` exist at the root (symlinks to OneDrive).

## Icon and splash

`src/assets/logo.svg` is the logo shown in the app (the apple traced from a drawing, the Swiss badge drawn geometrically: square 392, cross in the flag's proportions); `assets/logo.svg` is the same logo in a square viewBox.

The launcher icon is an adaptive icon (`mipmap-anydpi-v26/ic_launcher*.xml`): a white background colour, a vector foreground and a vector monochrome layer for themed icons (`drawable/ic_launcher_foreground.xml`, `drawable/ic_launcher_monochrome.xml`, the cross cut out of the badge). The logo is 56 dp tall in the 108 dp canvas, raised 1.9 dp, halfway to its visual centre, so it stays inside the 66 dp safe circle. Vectors keep it sharp on the Android 12+ splash screen, which draws the launcher icon large. The PNGs left (`ic_launcher.png` and `ic_launcher_round.png` for Android 7, `splash.png` for Android 11 and below) are renders of the logo with the same placement; `drawable/ic_stat_catchmeal.xml` is the logo in white for the status bar.

## Known debt

- **Inverted imports**: `src/data` imports types and helpers from `components/*` (types, `profile/api`, `food/barcode`, `theme/themeList`), and some hooks import from components. Shared types should move down to `src/data` (or a `src/types`).
- **`api.ts` bypassed**: `useGoals` (profile), `MeasureChart`, `aiContext`, `BarcodeField`, `BackupCard` and `HomePage` call `src/data` directly, so a write made there must notify the change bus by itself.
- **Decimals handled in four places** (`data/validation.ts`, `utils/decimals.ts`, `meal/draft.ts`, `recipe/recipeForm.ts`) and two `validation` modules (`data/` and `utils/`).
- **Hooks split** between `src/hooks` and feature folders (`recipe/useRecipeEditor.ts`, `analytics/useChartTooltip.ts`).
- **Large files**: `analytics/aiContext.ts` (596 lines), `food/FoodItemForm.tsx` (538).
- **Possibly dead columns**: check whether `profile.lean_loss_alert` and `goal_type` are still read.
