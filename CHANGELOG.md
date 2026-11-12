# Changelog

What changed in each version of CatCHMeal, the latest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Dates are picked in a calendar sheet from the bottom, in the theme's colours.
- Options are picked in a sheet from the bottom instead of a small list, the quick add category included.
- A search clears with one tap.
- A confirmation appears when exercises are added to a session.
- The AI summary compares a weekday with a weekend day, and its weekly detail runs Monday to Sunday, like the charts.
- A journal section, a library meal and the day's session are edited on a page of their own, the totals and the save button kept at the bottom.
- Foods and exercises are added from a full-screen search that stays open, those already added checked.
- A recipe is written or changed with an AI: the editor copies it as JSON with the food library, and imports the AI's answer into the form, the foods missing from the library listed.
- A food is duplicated from its ⋯ menu: the new food form opens filled with a copy, without the barcode.
- A recipe's ingredients move by dragging their handle.
- A recipe's ingredients can be split into named sections, such as « Poulet » and « Sauce »: in the editor, on the recipe, in the text for an AI and in the backup. The same food can go in two sections, and the search counts it (×2).
- Tapping a food opens its sheet: its calories and macros on one line, how often it was logged and the latest log. The food lists start with the foods logged most in the last 90 days, and the sort offers « Les plus loggés ».

### Changed

- A new logo: the apple keeps its flowing line and the cross becomes a Swiss flag. The app icon shows it larger, and sharp on the launch screen.
- The top of Home gathers the day's calories, macros and weight in one block. The bars take the theme's accent and stop sharply at the goal once it is passed.
- A dialog's delete moved into a ⋯ menu, apart from its close button.
- Save buttons name what they save.
- The interface speaks impersonally.
- Quantity steps read -10, -1, +1 and +10.
- Titles and labels are no longer in capitals.
- Calories in lists are plain text, without a pill.
- Barcodes are scanned with Android's own scanner, full screen: it opens at once on the rear camera and asks no camera permission.
- The recipe sent to an AI asks no questions of its own: it gives the goal for context only and ends on « Ma question : », like the stats.
- Restaurer, Vider and the recipe trash are red.
- Recipe steps are aligned left, with balanced lines and more space.
- A search finds each typed word in the name or the brand, in any order and without accents: « frite coop » finds Frites from Coop, « mure » finds Mûre.
- The buttons in dialog and page headers are larger, and the pill tabs react to a touch.
- The top of Stats sums up the period in one block: the average calories against the goal, a weekday against a weekend day, the protein against the goal, the weight from the first to the last weigh-in with its pace per week, and the sessions per week. The Sport tiles are gone.
- The Stats period fits on one row, its dates written 13/10.
- The Évolution chart no longer blows a few hundred grams up to its full height.
- Behind a dialog the page is only dimmed, no longer blurred, so a picker opens over it without stuttering.
- Every card shares one padding and one title style, the titles of Stats and Profile included.
- The items of a meal, a recipe or a session being edited take one line each. A tap opens a sheet with the item's calories and macros, live, its quantity and a trash that asks twice.
- The serving card of a recipe has its title, the calories beside it and the macros under it.
- The Profile is two blocks. The body block shows the latest weigh-in, then rows to the weigh-in history and to the profile (gender, age, height, activity). The goal block picks the goal in full width and the pace as pills with its kg per week, opens on what is left to lose or gain with a bar from the start to the target and its date, and folds how the goals are computed. The target and the daily goals are edited in their own dialog.
- A weigh-in opens with a tap on its row; it shows its date, weight and body fat on one line.
- The sessions chart is lower, shows from three weeks on, groups two weeks per bar when they do not fit, and follows the finger like the calorie chart.
- An exercise's sheet shows its best set, such as 10×110 kg, instead of an estimated 1RM that read low on sets not taken to failure. Its explanations open from an info icon right after the Repères title.
- Recipe steps move by dragging their handle instead of with arrows.
- The buttons that add a step, a section or the recipe to the shopping list take the whole width.
- A search result pulses as it is added.
- A recipe's duplicate and delete sit in a ⋯ menu beside its pencil; its edit page no longer deletes.
- A library meal opens with a tap on its row, without a pencil. The food and meal lists no longer fold their macros under a row: a food's are in its sheet, a meal's on its page.
- In an exercise's sheet, the best set comes before the record, which now sits beside the volume.

### Fixed

- A touch on a card's button or row shows clearly in dark themes too.
- The new food dialog fits on the screen without scrolling, its save button no longer cut.
- The picker's Suivant bar stays at the bottom, even with a short list.
- The servings stepper stays on the Ingrédients line.
- The journal's date picker stretches to the quick add button.
- A dialog no longer shows a focus ring around its close button when it opens.
- A weekly calorie bar covers its calendar week, Monday to Sunday: a forgotten day no longer stretches it, and its detail says how many days were logged.
- A touch on the Évolution chart picks the point under the finger, not always the same one.
- Every chart date reads 06/11: the calorie and Évolution charts wrote 06-11.
- A dialog's title and close button stay in place while its content scrolls, and a long dialog no longer runs under the status bar.
- A long recipe category, such as « Accompagnement », no longer overflows: the category takes a whole row, and a choice too long for its field ends with « … ».

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
