# Issue #907: Competition dropdown loses focus when scrolling in New submission

Session log, Thursday 8 October 2026. Prepared with Claude Web (Claude Opus 5.5).

---

## 1. Request

> Do this issue on a separate branch as we are not using Github. Give me git add and commits to do locally so I can push. Remember to use Test Driven Development

**Issue summary (#907, opened by GabeRaz):** For a signed-in user, the Competition dropdown under **Submissions → New submission** (`/submissions/new`) loses focus or closes when the user tries to scroll through its options. The reporter said that scrolling with the mouse wheel works. The issue asked for the difference between the failing interaction and the working one to be clarified (for example, scrollbar versus wheel or trackpad).

**Acceptance criteria:**

- Reproduce and document the affected browser, input device and exact failing scroll interaction.
- Competition options can be scrolled while the dropdown stays usable and focused.
- Scrolling does not change or clear the selected competition.
- Verify mouse wheel, trackpad, scrollbar and keyboard navigation where supported.
- Add a meaningful regression test where practical, and existing tests still pass.

Evidence: user report from 7 October 2026. No screenshot or recording was supplied.

---

## 2. Investigation

| Step | Finding |
|---|---|
| Cloned the repository and searched for the Competition field | `SubmissionPage.tsx` renders Competition with the shared `NameCombobox` component (`apps/frontend/src/components/NameCombobox.tsx`). The Fixture field and the new-fixture Competition field use the same component. |
| Read how `NameCombobox` keeps the list open | The wrapper `div` has an `onBlur` handler. It closes the list when focus moves to anything outside the wrapper, and a `null` `relatedTarget` (focus going to the page body) counts as outside. |
| Read the option list markup | Each option `<li>` has `onMouseDown={(event) => event.preventDefault()}`, so clicking an option does not take focus from the input. Nothing else in the popover had this. |
| Read the list styles (`styles.css`) | `.name-combobox__options` has `max-height: 18rem`, `overflow-y: auto` and `padding: 0.25rem`. The scrollbar and the padding belong to the `<ul>`, not to any option. |
| Checked the document `pointerdown` dismiss handler | It only closes for presses outside the wrapper, so it does not cause this bug. |
| Checked keyboard navigation | Arrow, Home and End keys move `aria-activedescendant` while focus stays on the input. Nothing scrolled the list, so in a long list the highlighted option could move out of view. |

---

## 3. Root cause

When the user presses the list's **scrollbar** (or its padding), the `mousedown` lands on the `<ul>`, not on an option, so its default action is not prevented. In Chrome this moves focus off the input to the page body. The wrapper's blur handler sees a `null` `relatedTarget`, decides focus has left the field and closes the list. The user cannot drag the scrollbar.

Mouse-wheel and trackpad scrolling fire `wheel` and `scroll` events but no `mousedown`, so focus never moves and the list stays open. This explains why the reporter found that the mouse wheel works. The failing interaction is **dragging the scrollbar**.

This was inferred from the code and confirmed with tests that reproduce the browser's focus behaviour. It was not reproduced in a real browser, and the reporter's exact browser, version and input device are still unconfirmed.

---

## 4. Fix (frontend only)

### `apps/frontend/src/components/NameCombobox.tsx`

- The popover container now has an `onMouseDown` handler that prevents the default for the primary button. This covers the options, the list's scrollbar and padding, and the loading, empty and error states. The per-option `onMouseDown` was removed because the popover handler now covers it. Dragging a scrollbar is not a default action of `mousedown`, so it still works. Clicks still fire, so choosing an option and the Retry button still work.
- New `useEffect`: when the keyboard-active option changes, it calls `scrollIntoView({ block: 'nearest' })` on it, so arrow, Home and End navigation keeps the highlighted option visible. The call is guarded because jsdom has no `scrollIntoView`.
- `aria-activedescendant` now reuses the same `activeOptionId` value.

### Tests (`apps/frontend/src/components/NameCombobox.test.tsx`)

jsdom fires `mousedown` but never moves focus. A helper, `pressPrimaryButtonOn`, does what a browser does: if the `mousedown` default is not prevented, it focuses the nearest focusable ancestor or blurs to the body. A new `describe('scrolling the open option list (#907)')` block uses a list of 30 competitions:

| Test | Before fix | After fix |
|---|---|---|
| Stays open and keeps focus when the list scrollbar is dragged | ❌ | ✅ |
| Stays open when the popover surface around the list is pressed | ❌ | ✅ |
| Stays open and changes nothing when scrolled with a wheel or trackpad | ✅ (guard) | ✅ |
| Still selects an option after the list has been scrolled | ❌ | ✅ |
| Closes when focus genuinely moves to another control | ✅ (guard) | ✅ |
| Scrolls the keyboard-active option into view | ❌ | ✅ |

The tests were written first, and the four expected failures were confirmed against the unchanged component (TDD red step) before the component was changed.

### Verification

- `NameCombobox.test.tsx`: 11 tests passed.
- Full frontend suite: **506 tests passed across 50 files**. The `@sport-analytics/contracts` workspace has to be built first in a fresh clone, or many test files fail to load.
- Prettier, ESLint, `tsc --noEmit` and dependency-cruiser (`npm run hygiene`) were clean.
- The patch applies cleanly to `main` at `f9256aa3`.
- Manual browser retest is still required (see section 6).

---

## 5. Commands

AI did not commit or push. The changes were supplied as `fix-907-combobox-scroll-focus.patch` with these commands:

```bash
git switch main && git pull
git switch -c fix/907-combobox-scroll-focus
git apply /path/to/fix-907-combobox-scroll-focus.patch

# 1 — red: failing regression tests
git add apps/frontend/src/components/NameCombobox.test.tsx
git commit -m "test(frontend): reproduce combobox closing when its option list is scrolled

Pressing the option list's scrollbar or padding moved focus off the input,
so the blur handler closed the list. Adds regression tests for scrollbar,
popover, wheel, selection after scrolling and keyboard visibility.

Refs #907

Assisted-by: Claude-Web[Claude Opus 5.5]"

# 2 — green: the fix
git add apps/frontend/src/components/NameCombobox.tsx
git commit -m "fix(frontend): keep combobox open while its option list is scrolled

Prevent the primary-button mousedown default on the whole popover rather
than on each option, so dragging the scrollbar no longer moves focus to
the body and closes the list. Also scroll the keyboard-active option into
view during arrow, Home and End navigation.

Refs #907

Assisted-by: Claude-Web[Claude Opus 5.5]"

# 3 — AI evidence
git add evidence/ai/registers/liora-rosenberg.csv \
  evidence/ai/transcripts/liora-rosenberg/2026-10-08-issue-907-competition-dropdown-scroll-focus.md
git commit -m "chore(ai): record ai use for issue 907

Refs #907

Assisted-by: Claude-Web[Claude Opus 5.5]"

npm run hygiene && npm run check
git push -u origin fix/907-combobox-scroll-focus
```

Commit 1 fails on its own by design, as the TDD red step. All three should be pushed together so CI only runs on the passing tip.

---

## 6. Suggested text for the issue's Resolution and Verification sections

**Resolution:** `NameCombobox` prevented the `mousedown` default only on individual options. A press on the option list's scrollbar or padding therefore moved focus to the page body, and the field's blur handler closed the list. Wheel and trackpad scrolling fire no `mousedown`, which is why they worked. The primary-button `mousedown` default is now prevented on the whole popover, and the keyboard-active option is scrolled into view. The fix is in the shared component, so the Fixture and new-fixture Competition dropdowns also benefit. Regression tests were added in `NameCombobox.test.tsx`. Branch `fix/907-combobox-scroll-focus`.

**Verification (to complete before closing):**

- [ ] Chrome: drag the Competition list's scrollbar. The list stays open, focus stays in the field and the selection is unchanged.
- [ ] Firefox and Safari: same check.
- [ ] Mouse wheel and trackpad scrolling still work.
- [ ] Touch scrolling on a mobile device works.
- [ ] Keyboard: ArrowDown, ArrowUp, Home and End keep the highlighted option visible, and Enter selects it.
- [ ] Clicking outside the field, or pressing Tab or Escape, still closes the list.
- [ ] Record the reporter's browser, version and input device on the issue.
- [ ] `npm run check` passes.
