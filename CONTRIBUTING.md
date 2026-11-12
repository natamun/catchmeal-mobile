# Contributing

How to build the app from the code, work on it and publish a version, the commit rules, and how the data is stored. To simply install the app, download the APK from the [latest release](https://github.com/natamun/catchmeal-mobile/releases/latest), as the [README](./README.md) explains.

Work is committed directly on `main`. Run `make check` before pushing: it runs the same checks as CI (format, lint, build, unit tests).

## Building it yourself

**1. Prepare the computer.** The commands below work on Linux and macOS. On Windows, use them in [WSL](https://learn.microsoft.com/windows/wsl/install).

- **Node.js 22 or newer**, from [nodejs.org](https://nodejs.org) or a version manager such as nvm.
- **The Android SDK and JDK 21.** The simplest way is [Android Studio](https://developer.android.com/studio): its first launch installs the SDK, and it ships a JDK 21. Without it, for instance in WSL, install a JDK 21 (`sudo apt install openjdk-21-jdk`) and the [command-line tools](https://developer.android.com/studio#command-line-tools-only), then run `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`.
- **Two environment variables**, in your `~/.bashrc` or `~/.zshrc`:

  ```bash
  export ANDROID_HOME="$HOME/Android/Sdk"   # macOS: $HOME/Library/Android/sdk
  export JAVA_HOME="/path/to/jdk-21"        # Android Studio's: its jbr folder
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
  ```

**2. Get the project.**

```bash
git clone https://github.com/natamun/catchmeal-mobile.git
cd catchmeal-mobile
npm ci
```

**3. Connect the phone.**

1. On the phone, turn on the developer options: in **Settings > About phone** (on a Samsung, **About phone > Software information**), tap **Build number** seven times.
2. In **Settings > Developer options**, turn on **USB debugging**.
3. Plug the phone into the computer and accept the **Allow USB debugging?** prompt. `adb devices` should now list it as `device`.

> [!TIP]
> On WSL, Windows keeps the USB devices: pass the phone to Linux with [usbipd-win](https://github.com/dorssel/usbipd-win), `usbipd attach --wsl --busid <BUSID> --auto-attach`.

**4. Install.** `make phone` builds and installs the development app, **CatCHMeal dev**. To build the real app, create a release key first (see [Releases](#releases)).

## Commands

| Command | What it does |
|---|---|
| `make check` | Format check, lint, build and tests, like the CI |
| `make format` | Formats the code |
| `make lint` | Fixes what the linter can |
| `make knip` | Lists unused files, exports and dependencies |
| `make phone` | Builds the development app and installs it on the phone |
| `make apk` | Builds the development app as an APK |
| `make dev` + `make live` | Live development, in two terminals |
| `make release` | Builds the real app, signed, as `release/catchmeal-<version>.apk` |
| `make installRelease` | Installs that APK on the phone, as an update |

The development app (`io.github.natamun.catchmeal.debug`) and the real one (`io.github.natamun.catchmeal`) are two apps side by side, each with its own data: testing never touches the real data.

In live development, the phone loads the code from the computer through the USB cable and reloads on every change. Stop `make live` with Ctrl+C. Both use port 5174, which `DEV_PORT=<port>` changes.

## Commits

Format: `type: short description in English`

| Type        | When                                                         |
| ----------- | ------------------------------------------------------------ |
| `feat:`     | new feature, or a feature that works differently             |
| `fix:`      | bug fix                                                      |
| `style:`    | look only: layout, sizes, spacing, icons, wording on screen  |
| `perf:`     | faster or lighter, same behavior                             |
| `refactor:` | reorganization without changing behavior                     |
| `test:`     | tests added or corrected                                     |
| `docs:`     | README, CONTRIBUTING, comments                               |
| `build:`    | build and packaging: Makefile, Gradle, versions, signing, dependencies |
| `ci:`       | pipeline, GitHub Actions                                     |
| `chore:`    | other maintenance: .gitignore, tool config                   |
| `revert:`   | undoes an earlier commit, named in the description           |

Examples:

```
feat: log a food by the portion, such as a biscuit of 12 g
fix: handle null pointer on early exit
style: enlarge the meal total to the field height
refactor: extract parsing logic into separate class
build: sign the release with a key kept off the repository
docs: update README with installation steps
```

Each commit should represent one complete, logical change, not more, not less. If a change touches several independent pieces (e.g. multiple pages, or a feature plus unrelated config), split it into separate commits, one per piece.

## Releases

The version lives in `package.json` alone, in the form major.minor.patch. The settings card shows the one installed, and Android's version number is derived from it (1.2.3 gives 10203), so each version updates the one before.

The real app is signed with a release key kept off the repository: `catchmeal-release.jks` and its password in `.password`, both at the root and ignored by git.

> [!WARNING]
> Android refuses an update signed with another key: lose the key, and the installed app can no longer be updated. Keep a copy of both files off the computer, such as in a password manager. Git ignores them, but `git clean -fdx` would delete them.

To create your own key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32), end='')" > .password
keytool -genkeypair -keystore catchmeal-release.jks -storetype PKCS12 \
  -alias catchmeal -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=CatCHMeal" \
  -storepass:file .password -keypass:file .password
```

For a new version:

1. Raise the version: `npm version minor --no-git-tag-version` (or `patch` for a fix).
2. Tell what changed for the user at the top of [CHANGELOG.md](./CHANGELOG.md).
3. Build it with `make release`, and update the phone with `make installRelease`.
4. Publish it: push the commits, then create the GitHub release with its APK, `gh release create v<version> release/catchmeal-<version>.apk --title "CatCHMeal <version>" --notes "..."`, its notes taken from the changelog.

## Code layout

| Folder | Content |
|---|---|
| `src/db` | The database layer: one queue for every statement, transactions, migrations (`PRAGMA user_version`) |
| `src/data` | The business rules and SQL of each feature, tested in Node against a real SQLite database |
| `src/native` | The Android-only parts: back button, native HTTP, backup files, sharing, notifications, barcode scanning |
| `src/components`, `src/pages` | The screens; each feature's `api.ts` connects them to `data` |
| `android` | The Android project generated by Capacitor |

## Data model

```mermaid
erDiagram
    profile {
        int id PK "always 1"
        real height
        real target_weight
        real target_body_fat "sets the target weight when known"
        real goal_pace "% of the weight per week"
        int daily_calorie_goal
        text gender
        text birth_date
        text activity_level
    }
    food_item {
        int id PK
        text name
        text barcode
        real base_quantity
        text base_unit
        real kcal
        real portion_quantity "one piece, in g or ml"
        int archived
    }
    meal {
        int id PK
        text name
        text type_meal
        text logged_at "local day, null in the library"
        int source_meal_id FK
    }
    meal_item {
        int id PK
        int meal_id FK
        int food_item_id FK "null for a recipe or a quick add"
        int recipe_id FK "servings of a recipe"
        real quantity "in the food's unit, or servings"
        real kcal
    }
    recipe {
        int id PK
        text name
        int servings
        text category
        int prep_minutes
        text cooking
        text notes
        int archived
    }
    recipe_ingredient {
        int id PK
        int recipe_id FK
        int food_item_id FK
        int position
        real quantity "in the food's unit"
    }
    recipe_step {
        int id PK
        int recipe_id FK
        int position
        text instruction
    }
    shopping_item {
        int id PK
        int food_item_id FK "once each, null for a free text"
        text label "free text"
        real quantity "in the food's unit"
        int checked
    }
    weight_log {
        int id PK
        real weight
        real body_fat
        text logged_at
    }
    goal_setting {
        int id PK
        int daily_calories
        text objective
        text start_date
    }
    exercise {
        int id PK
        text name
        text kind "STRENGTH, TREADMILL or CARDIO"
        int archived
    }
    workout {
        int id PK
        text performed_on "local day, one session a day"
    }
    workout_exercise {
        int id PK
        int workout_id FK
        int exercise_id FK
        int position
    }
    workout_set {
        int id PK
        int workout_exercise_id FK
        int reps
        real weight_kg
    }
    cardio_set {
        int id PK
        int workout_exercise_id FK
        int position
        real duration_minutes
        real speed_kmh "treadmill"
        real incline_percent "treadmill"
        real resistance "other machines, optional"
    }
    workout_template {
        int id PK
        text name
    }
    workout_template_exercise {
        int id PK
        int template_id FK
        int exercise_id FK
        int position
    }

    meal ||--o{ meal_item : "contains"
    meal ||--o| meal : "made from"
    food_item ||--o{ meal_item : "used in"
    recipe ||--o{ meal_item : "logged in"
    recipe ||--|{ recipe_ingredient : "contains"
    food_item ||--o{ recipe_ingredient : "used in"
    recipe ||--o{ recipe_step : "made of"
    food_item ||--o| shopping_item : "to buy"
    workout ||--|{ workout_exercise : "contains"
    exercise ||--o{ workout_exercise : "done in"
    workout_exercise ||--o{ workout_set : "made of"
    workout_exercise ||--o{ cardio_set : "made of"
    workout_template ||--|{ workout_template_exercise : "contains"
    exercise ||--o{ workout_template_exercise : "used in"
```

- A meal line stores the calories and macros computed when the meal is saved, so editing or archiving a food or a recipe later leaves past meals unchanged.
- A recipe's calories and macros are not stored: they come from the current values of its foods. A deleted recipe is archived, like a food, so the meals that logged it keep its name.
- The shopping list holds each food once: adding it again adds up the quantity, whatever recipe it is for.
- Training sessions are a logbook: their calories are neither estimated nor added to the goals, because the measured expenditure already holds the training.
- Some columns are left from earlier versions, empty and no longer read: `met` in `exercise`, the effort once used to estimate those calories; `name` and `duration_minutes` in `workout`, since the sessions became one a day; and `duration_minutes`, `speed_kmh` and `incline_percent` in `workout_exercise` and `workout_template_exercise`, since cardio is logged in sets. A favorite holds no values: a session started from it begins with the sets of the last time.
