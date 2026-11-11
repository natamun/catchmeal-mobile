# Changelog

What changed in each version of CatCHMeal, the latest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Dates are picked in a calendar sheet from the bottom, in the theme's colours.
- Options are picked in a sheet from the bottom instead of a small list, the quick add category included.
- A search clears with one tap.
- A confirmation appears when exercises are added to a session.

### Changed

- The top of Home gathers the day's calories, macros and weight in one block. The bars take the theme's accent and stop sharply at the goal once it is passed.
- A dialog's delete moved into a ⋯ menu, apart from its close button.
- Save buttons name what they save.
- The interface speaks impersonally.
- Quantity steps read -10, -1, +1 and +10.
- Titles and labels are no longer in capitals.
- Calories in lists are plain text, without a pill.
- Restaurer, Vider and the recipe trash are red.
- Recipe steps are aligned left, with balanced lines and more space.
- The profile summary no longer shows the activity level.
- The buttons in dialog and page headers are larger, and the pill tabs react to a touch.

### Fixed

- The picker's Suivant bar stays at the bottom, even with a short list.
- The servings stepper stays on the Ingrédients line.
- The journal's date picker stretches to the quick add button.
- A dialog no longer shows a focus ring around its close button when it opens.
- A weekly calorie bar covers its calendar week, Monday to Sunday: a forgotten day no longer stretches it, and its detail says how many days were logged.
- Every chart date reads 06/11: the calorie and Évolution charts wrote 06-11.

## [0.9.3] - 2026-11-09

### Added

- Cardio is logged in sets, like strength: each treadmill set has its own duration, speed and incline, and the other machines an optional resistance. The sessions logged so far become one set each.
- A recipe can be sent to an AI chat, by copy or share, with your goal and daily targets, to get its opinion and an improved version.

### Changed

- A favorite session starts its cardio from the last time, like its strength, instead of holding its own duration, speed and incline.

## [0.9.2] - 2026-11-09

### Fixed

- Saving a new food from the food page: since 0.9.1, the form closed and said the food was saved, but nothing was stored.
- A confirmation shown right after another one disappeared before its 3 seconds.

## [0.9.1] - 2026-11-09

### Added

- **Recipes**: ingredients from the food library, cooking, numbered steps and notes, a category and a preparation time. A recipe shows its calories and macros per serving and its quantities for any number of servings, and keeps the screen on while you cook. It can be duplicated into a variant, and is logged in the journal by the serving.
- **Shopping list**, in a fourth tab of the food page: foods, meals and recipes added for the servings you need, the same food added up into one line, and free items. You tick it off in the shop and share it as text. A recipe adds its ingredients from its own page.
- Quantities can be typed on the keyboard, beside their buttons.
- The recipe list filters by category.

### Changed

- The range sliders of the filter panel are smoother, with larger handles.
- The legend of the macro colors moved from its bubble to the filter panel.
- Every search shows the same short placeholder.
- A confirmation can be swiped away.

## [0.9.0] - 2026-11-08

The first version, used as the daily app.

### Added

- Food journal of four sections a day, with the calorie and macro progress.
- Barcode scanning with Open Food Facts.
- Food library, with an optional portion to log by the piece, a meal library and quick add.
- Weigh-ins with body fat, fat-free mass, body water and muscle mass.
- Energy expenditure measured from the journal and the weigh-ins.
- Daily calories and macros recommended for the goal and the weekly pace, a target body fat, and the composition trend with its alert.
- Training logbook: strength sets and cardio, exercise library, favorite sessions, and exercise sheets with records and progress.
- Statistics over a chosen period, and a summary to paste into an AI chat.
- Weigh-in reminder, backup and restore in one file, and twelve color themes.
