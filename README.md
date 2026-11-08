<p align="center">
  <img src="src/assets/logo.svg" alt="CatCHMeal logo" width="88">
</p>

<h1 align="center">CatCHMeal</h1>

<p align="center">
  A calorie tracker and training logbook for Android, in French.<br>
  No account, no server: everything stays on the phone.
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white" alt="Capacitor 8">
  <img src="https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6">
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#installing-on-an-android-phone">Install</a> ·
  <a href="#development">Development</a> ·
  <a href="#data-model">Data model</a>
</p>

---

CatCHMeal logs what you eat, scans barcodes with Open Food Facts, measures your real energy expenditure from your journal and weigh-ins, and recommends calories and macros for your goal. The data lives in SQLite on the device: only the barcode lookups go online.

It started from CatCHMeal, a web app built as a team for the ft_transcendence project at 42, cut down and rebuilt as a single-user phone app.

## Features

### Nutrition

- **Journal**: four sections a day (breakfast, lunch, dinner, snack), with the calorie and macro progress.
- **Barcode scanning**: the camera reads EAN and UPC codes, and [Open Food Facts](https://world.openfoodfacts.org) fills the food form.
- **Food library**: values per 100 g, 100 ml or per piece. Foods are archived rather than deleted, so past meals keep their data.
- **Portions**: a food can have one, such as a biscuit of 12 g, to be logged by the piece ("4 biscuits") and saved in grams. Open Food Facts fills it when their serving is one piece.
- **Meal library and quick add**: meals saved once and logged again in one go, or calories and macros typed by hand.

### Body and goals

- **Weigh-ins** with body fat, fat-free mass, body water and muscle mass.
- **Measured expenditure**: the average of the calories logged, minus the weight trend × 7,700 kcal per kg, over the last four weeks. Until there is enough data, it is estimated from the BMR (Mifflin-St Jeor, or Katch-McArdle with the fat-free mass). A measure that holds the first two weeks of a goal is flagged, since water and glycogen skew it.
- **Recommended goals**: daily calories and macros from a goal (lose fat, lose weight, maintain, build muscle) and a weekly pace, never under the BMR. The protein follows the fat-free mass when the scale tells it.
- **Target body fat**: picked by level (lean, athletic, fit), it sets the target weight from the fat-free mass at each weigh-in.
- **Composition trend**: how the fat and the fat-free mass moved since the goal began, with an alert when the fat rises faster than the fat-free mass while building, or when the fat-free mass falls too fast while losing.

### Training

- **Logbook**, kept like the food journal: one session a day, each exercise once. Strength holds sets of repetitions at a load, the treadmill a duration, speed and slope, other cardio a duration.
- **Training library**: exercises and favorite sessions, each recalling its last values. It starts empty, and an exercise can be created right from its search.
- **Exercise sheet**: records, estimated one-rep max, progress curve and last sessions. Saving a session tells the new records.

### Statistics

- **Charts** over a chosen period: calories, macros and body measures, each measure with its dashed trend and its change per week, set against the pace aimed at.
- **Training**: sessions per week (strength and cardio), volume lifted, cardio time, treadmill distance and climb.
- **AI summary**: the period as text to paste into an AI chat, with the profile, goals and pace, the measured expenditure and its method, the body composition, the meals and the training, day by day or week by week.

### And also

- **Weigh-in reminder**: an optional notification every Sunday morning.
- **Backup and restore**: all the data in one JSON file, shared through Android (Drive, e-mail, Files) and restored all or nothing.
- **Twelve color themes** from known palettes (Graphite, Nord, Dracula, Gruvbox, Catppuccin, Rosé Pine, Tokyo Night, Monokai, Solarized dark and light, navy and coral, Klein and cream), each with two accents.

## Technical stack

| Layer | Tools |
|---|---|
| Interface | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router, Recharts |
| Android | Capacitor 8, which wraps the web app and gives it native plugins |
| Storage | SQLite through `@capacitor-community/sqlite`, with versioned migrations (`PRAGMA user_version`) |
| Barcodes | zxing-wasm, decoding in the WebView |
| Tests | Vitest: the business rules and the SQL run against a real SQLite database in Node |

### Code layout

| Folder | Content |
|---|---|
| `src/db` | The database layer: one queue for every statement, transactions, migrations |
| `src/data` | The business rules and SQL of each feature, tested in Node |
| `src/native` | The Android-only parts: back button, native HTTP, backup files, sharing, notifications |
| `src/components`, `src/pages` | The screens; each feature's `api.ts` connects them to `data` |
| `android` | The Android project generated by Capacitor |

## Installing on an Android phone

The app is not on the Play Store: it is built from this repository on a computer, then installed on the phone, with a USB cable or as an APK file. It runs on Android 7 or newer.

### 1. Prepare the computer

The commands below work on Linux and macOS. On Windows, use them in [WSL](https://learn.microsoft.com/windows/wsl/install).

- **Node.js 22 or newer**, from [nodejs.org](https://nodejs.org) or a version manager such as nvm.
- **The Android SDK and JDK 21.** The simplest way is [Android Studio](https://developer.android.com/studio): its first launch installs the SDK, and it ships a JDK 21. Without it, for instance in WSL, install a JDK 21 (`sudo apt install openjdk-21-jdk`) and the [command-line tools](https://developer.android.com/studio#command-line-tools-only), then run `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`.
- **Two environment variables**, in your `~/.bashrc` or `~/.zshrc`:

  ```bash
  export ANDROID_HOME="$HOME/Android/Sdk"   # macOS: $HOME/Library/Android/sdk
  export JAVA_HOME="/path/to/jdk-21"        # Android Studio's: its jbr folder
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
  ```

### 2. Get the project

```bash
git clone https://github.com/natamun/catchmeal-mobile.git
cd catchmeal-mobile
npm ci
```

### 3. Install the app

**With a USB cable**

1. On the phone, turn on the developer options: in **Settings > About phone** (on a Samsung, **About phone > Software information**), tap **Build number** seven times.
2. In **Settings > Developer options**, turn on **USB debugging**.
3. Plug the phone into the computer and accept the **Allow USB debugging?** prompt. `adb devices` should now list it as `device`.
4. Run `make phone`: it builds the app and installs it.

> [!TIP]
> On WSL, Windows keeps the USB devices: pass the phone to Linux with [usbipd-win](https://github.com/dorssel/usbipd-win), `usbipd attach --wsl --busid <BUSID> --auto-attach`.

**Without a cable**

1. Run `make apk`. The file is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
2. Send it to the phone, through Drive, e-mail or a USB file transfer.
3. Open it from the **Files** app. Android asks to allow installing apps from this source: allow it, then install. If Play Protect warns about an unknown app, choose to install anyway.

### Updating

Pull the new code (`git pull`), then run `make phone` or install a new APK the same way: the app is updated in place and keeps its data.

## Data and backup

> [!WARNING]
> Uninstalling the app deletes its data, and Android refuses an update signed with another key. The key is created on the computer at the first build (`~/.android/debug.keystore`): keep a copy of it, and put it back before building from another computer. Export a backup regularly from the profile page.

## Development

| Command | What it does |
|---|---|
| `make check` | Format check, lint, build and tests, like the CI |
| `make format` | Formats the code |
| `make lint` | Fixes what the linter can |
| `make phone` | Builds the app and installs it on the phone |
| `make apk` | Builds an APK to install without a cable |
| `make dev` + `make live` | Live development, in two terminals |

In live development, the phone loads the code from the computer through the USB cable and reloads on every change. Stop `make live` with Ctrl+C, then run `make phone` to install the normal app again. Both use port 5174, which `DEV_PORT=<port>` changes.

## Data model

<details>
<summary>The tables and their links</summary>

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
        int food_item_id FK "null for a quick add"
        real quantity
        real kcal
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
        real duration_minutes "cardio"
        real speed_kmh "treadmill"
        real incline_percent "treadmill"
    }
    workout_set {
        int id PK
        int workout_exercise_id FK
        int reps
        real weight_kg
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
        real duration_minutes "cardio, optional"
        real speed_kmh "treadmill, optional"
        real incline_percent "treadmill, optional"
    }

    meal ||--o{ meal_item : "contains"
    meal ||--o| meal : "made from"
    food_item ||--o{ meal_item : "used in"
    workout ||--|{ workout_exercise : "contains"
    exercise ||--o{ workout_exercise : "done in"
    workout_exercise ||--o{ workout_set : "made of"
    workout_template ||--|{ workout_template_exercise : "contains"
    exercise ||--o{ workout_template_exercise : "used in"
```

</details>

- A meal line stores the calories and macros computed when the meal is saved, so editing or archiving a food later leaves past meals unchanged.
- Training sessions are a logbook: their calories are neither estimated nor added to the goals, because the measured expenditure already holds the training.
- Three columns are left from earlier versions and no longer read: `met` in `exercise`, the effort once used to estimate those calories, and `name` and `duration_minutes` in `workout`, empty since the sessions became one a day.

## Credits

- Built from CatCHMeal, the ft_transcendence team project at 42, under the [MIT license](./LICENSE).
- Food product data comes from [Open Food Facts](https://world.openfoodfacts.org), a free, open and collaborative database licensed under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/).
