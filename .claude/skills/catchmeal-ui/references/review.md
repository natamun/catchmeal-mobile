# Reviewing a screen or comparing proposals

Read the code of the screen first; then, for balance, spacing and the overall feel, ask `ui-inspector` for screenshots. Capture exactly the scope asked. Reviewing a screen covers everything it opens (its dialogs, sheets, pickers and flow pages, and the bottom of the page when it scrolls): list them from the code and capture all of them, in as many batches as it takes. Reviewing one dialog or one piece covers only that piece and its states. Structure before cosmetics: a well coloured screen with the wrong structure is still wrong.

## Checklist

**Intent and flow**
- The intent fits in one sentence; the main action is the most visible element.
- No dead end: every state has a way forward or back (Android back button included).
- Selection lists have a search when they can grow.

**Touch and layout**
- Every target is at least 44 px (`tap-area` counts), with no overlapping touch areas.
- One direction per section; no card in a card.
- Long real strings (a 40-character food name, a big number, 4-digit kcal) truncate on one line in list rows and wrap cleanly elsewhere, at 360 px wide.
- Nothing moves under the thumb when the content changes (a longer month, a message, a list that loads).
- The keyboard does not cover the field being typed in, nor the button to confirm.

**Hierarchy**
- One focal point, three tiers at most, metadata smaller and dimmer.
- Primary and secondary actions look clearly different.

**Consistency**
- Tokens only, works in a dark and a light theme.
- One radius per kind of element, one icon weight, type sizes from the existing scale.
- Two controls doing the same job look the same.
- An edit view shows at least what the read view shows; controls sharing a row share its width; no title is cut by its action.

**States**
- Default, pressed (every tappable, third-party pieces included), disabled, and loading when the action waits.
- Field errors in `FieldError`, nothing shifts; destructive actions in red and confirmed.
- Empty state and loading state present; a toast confirms a save.

**Mobile patterns**
- Pickers open as a sheet or inline, not a small bubble; search fields have a clear button.
- Similar lists behave the same; every stat says what it helps decide.
- Step buttons have explicit labels ("+10", "+1").

**Words**
- Buttons name the action, the toast reuses the verb, errors say how to fix.

## Output

For one screen: at most 6 findings, most important first.

```
[What is wrong] at [file:line]
Before: what the user sees now
After: the specific change
Why: the rule or principle it breaks
```

To compare proposals: one short paragraph per proposal (strength, weakness), then the one you recommend and why, then what to borrow from the others. The user decides.
