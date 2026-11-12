---
name: catchmeal-ui
description: How to design and review CatCHMeal's interface. Use it before building or reshaping a screen, a layout, a dialog or a shared component, when the user asks for visual proposals, and when a screen looks generic, cramped or "made by an AI". Covers the design system to keep, mobile rules, the 3-proposal workflow and the review before the user picks.
---

# CatCHMeal UI

CatCHMeal is a phone app (Capacitor web view, Galaxy S21+, one hand, often at the table or at the gym). It has its own identity: keep it, and make each screen better inside it. Never import another design system (Material 3, shadcn, a new font, a new palette) unless the user asks.

## The system to keep

- **Colours are tokens only**, from `src/index.css`: the scale `theme-50` to `theme-800` (background to strongest text), `theme-500` the accent, `surface` for cards and fields, `on-accent` for text on the accent, `accent-2` the second accent. Never a hex value or a Tailwind palette colour in a component, except red for errors and destructive actions.
- **12 themes** (`data-theme`, picked in the profile), dark and light (`solarized-light`). A screen must work in all of them: no colour that only reads on graphite.
- `swiss-red` is the brand (logo, "CH"): never for a UI state.
- **Inter** for everything, lucide icons at one stroke weight. No emoji as icons.
- Reuse `src/components/ui` (BaseDialog, Card, Input, Textarea, FieldError, PillTabs, QuantityStepper, SheetSection, StatTile, ListRow, ListStatus, IconButton, RemoveIconButton, Toast...) before writing a new piece. Before writing a row, a button or a state block by hand, search the other screens for the same classes: a pattern that comes back on a second screen becomes a piece there, with JSDoc, in its own commit before the feature.
- The `hover:` variant also fires on `:active`, so it gives touch feedback: every tappable element has a pressed state, those of third-party pieces included (calendar arrows). The pressed colour must show on what it sits on: on a card (`surface`) use `theme-100`; `theme-50` is the page background and barely differs from `surface` in dark themes. Screenshots never show a pressed state: check its class against its background in the code.

## Mobile rules (hard)

1. **Touch targets at least 44 px** (`h-11` or more, padding that gets there, or `tap-area`, which keeps a small icon and widens the area it answers to 48 px). Two touch areas never overlap. Some existing buttons are `h-10` or `h-8`: fix them when you touch the screen.
2. **Errors and destructive actions in red**, whatever the theme.
3. **Every screen has its empty and loading states.** First use points at the main action; "no results" names the search and offers a way out.
4. **Nothing moves under the thumb**: errors float in `FieldError`; a dialog, a sheet or a form never changes height because of a message or of its content (a calendar always shows six weeks), so no control slides under the next tap. Never block typing: accept the input, show the error after.
5. **One direction per section**: a section stacks vertically or scrolls horizontally, never both. Never a card inside a card: group with space instead.

## Guidance (judgement)

- **One screen, one job.** Write the screen's intent in one sentence before coding; if you cannot, it does too much. The main action is the most visible thing on the screen, ideally in the thumb's reach (lower half).
- **Hierarchy in three tiers** at most: the main figure or content, the supporting content, the metadata (smaller and dimmer, `theme-400`/`theme-600`).
- **The accent marks actions, active states, section titles, field labels and the second line of list rows** (sentence case); help sentences and descriptions stay grey. Without it, a screen looks flat.
- **Space on a 4 px grid** (Tailwind steps). Related things close, groups apart.
- **One radius per kind of thing**: reuse the radius of the existing component of the same kind (cards and dialogs `rounded-2xl`, round buttons `rounded-full`); do not add a new one.
- **Motion answers an action** (opening, confirming, swiping) and follows its direction; never linear easing; reuse the animations in `src/index.css`. No decorative entrance on every block.
- **A gesture always has a visible control too** (swiping between tabs and the tab bar). A toast is the exception: it also leaves by itself.
- **Form length decides the container**: a short edit fits a dialog; a long or multi-step form is a flow page (`FlowLayer`), not a tall dialog.
- **Pickers use a mobile pattern** (`BottomSheet`, or an inline strip), not a small bubble under the field. A sheet closes with its ×, the back button, a tap outside and a swipe down.
- **Similar things behave the same**: if tapping an exercise opens its stats, tapping a food should too. Same list, same row, same gesture.
- **An edit view shows at least what the read view shows** (the kcal of each entry). **Controls sharing a row share its width**, with no empty gap between them, and an action never cuts the title beside it.
- **Every stat earns its place**: say what decision it helps the user make, or what motivates them. A figure nobody acts on goes.
- **Step buttons are explicit**: "+10" and "+1" beside a typed value, never ambiguous symbols like "++" or "--".
- **Search fields have a clear (×) button** once they hold text.
- **List rows keep one height and no chevron**: a long name truncates on one line, the full name is in the item's sheet, and a tap opens it without an arrow. Only an action row such as Profile's « Modifier les objectifs » (`ChevronRow`) shows one.
- **Text alignment**: left, long prose included (recipe steps, notes), never justified: on a phone it leaves large gaps between words, even with hyphenation. Long prose gets `text-wrap: pretty` and a relaxed line height.

## Words on screen

- French, impersonal or "vous", sentence case, no em-dash.
- A button says what happens ("Enregistrer le repas", not "Valider"), and the toast reuses the verb ("Repas enregistré").
- Errors say what is wrong and how to fix it, without apologising. Empty states invite the next action.
- Name things as the user does ("repas", "bibliothèque"), never as the code does.

## Avoid the generated look

Before showing a proposal, check that it has none of these unless it was chosen on purpose: identical cards with the same shadow everywhere; gradients as decoration; ALL-CAPS labels above headings; one word in a headline coloured or bold; "→" on buttons; numbered markers on things that are not steps; the same stat row repeated on several screens; icons coloured for decoration rather than status; a card that shows something but does nothing. Spend boldness in one place per screen, then remove one decoration before handing over.

## Workflow for a visual change

1. **Plan**: the screen's intent, what the user sees first, the layout in a small ASCII sketch, and which `ui/` pieces it uses.
2. **Three proposals** that differ in structure, not only in colour (for example: list first, summary first, one big action). Review each plan against "Avoid the generated look" and say what you changed.
3. **Build them** in CatCHMeal dev behind a temporary selector "Essai : 1 / 2 / 3" on the screen, install with `make phone` (via `android-builder`). Commit nothing while the proposals are open.
4. **Look and compare**: ask `ui-inspector` for screenshots of each proposal (with a long name, an empty day, a light theme), then compare with `references/review.md` and give your recommendation. Give the user what to try on the phone.
5. Once the user picks, remove the other two and the selector, then commit the chosen one alone.

For a small change (a spacing, a label, one button), skip the proposals: apply the rules and the checklist. Then hand the user a short list of what to check on the phone, and commit once they validate; capture with `ui-inspector` only when they ask.
