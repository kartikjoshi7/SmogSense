# Accessibility

SmogSense targets WCAG 2.2 level AA. Many of its users are older people, children's parents and
people with breathing conditions, often on a phone, so the plan has to work by keyboard, by
screen reader, by ear and in Hindi.

## What is built in

**Structure**

- Landmarks: a header, one `main` and a footer, with a "Skip to main content" link first in the tab
  order (`src/ui/app.tsx`).
- One `h1` per screen, then `h2` sections that are labelled regions (AQI, forecast, inversion,
  timeline, plan, what-if).
- `lang` on the page follows the chosen language (`state/app-context.tsx`). A community notice in
  another language carries its own `lang`: the language asked for when the AI wrote it, English
  when it is standard guidance.

**Forms** (`components/setup/*`, `components/common/fields.tsx`)

- Every control has a visible `label`; groups such as health conditions and commute alternatives
  are `fieldset`s with a `legend`.
- Range errors are linked to their field with `aria-describedby` and `aria-invalid`; a summary is
  announced with `role="alert"` when the form is submitted with problems.
- Location search and GPS progress are announced through a `role="status"` live region, and a
  failed search says so instead of reporting "no places found".

**Focus**

- On first load focus stays at the top, so Tab reaches the skip link first. When the setup form
  and the plan replace each other, focus moves to the new `h1`.
- The `Dialog` component (`components/common/dialog.tsx`) moves focus inside on open, keeps Tab and
  Shift+Tab inside (pulling focus back if it escaped), closes on Esc and returns focus to the button
  that opened it.
- In the chat, a suggested question disappears once it is answered, so focus moves to the question
  box instead of falling back to the page.
- Plan categories follow the WAI-ARIA tabs pattern: one tab stop, arrow keys, Home and End.
- A 3 px focus outline in a colour that contrasts in both themes.

**Information that does not rely on sight or colour**

- The AQI is shown as a number, a category in words, a symbol and a colour band, never colour
  alone; the advice is a sentence.
- The forecast chart is an SVG with `role="img"`, a title and a text description of the cleanest
  hour, and a button that swaps it for a data table with row headers. An hour with no forecast is
  drawn as a dashed outline, never as a zero-height bar that would look like clean air, and the
  description says how many hours are missing.
- Every AI or standard-guidance label is text, not only an icon.
- Loading, "writing explanations", chat answers and notices are announced through live regions.
  The chat's message list is a live region from the start, so the first answer is announced too.
- Error messages are written in the interface language, chosen from the response status; server
  text is never shown, so a Hindi page never shows an English error.

**Reading and language**

- The interface is in English and Hindi; AI answers and notices can be in ten languages.
- Every recommendation card has a "Read aloud" button that uses the browser's speech synthesis
  and asks for an Indian English or Hindi voice; it is hidden where the browser cannot speak.
- Plain, short sentences in the problem's own words.

**Visual**

- Text and controls meet WCAG AA contrast in light and dark themes, which follow
  `prefers-color-scheme`. AQI bands pair a tinted background with dark text.
- Buttons, links, inputs, selects, checkbox rows and the slider are at least 44 × 44 px; links
  inside a sentence are exempt, as WCAG 2.5.8 allows.
- Animations and transitions are switched off under `prefers-reduced-motion`.
- The layout fits phone widths without sideways scrolling (tested automatically at 375 and
  390 px).

## How it is tested

| Check                        | Where                                                    | What it covers                                                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| axe-core in Vitest (jsdom)   | `src/ui/**/*.test.tsx`                                   | Setup form with errors, the plan, both dialogs, lifestyle fields; no colour contrast (jsdom cannot render)                                                                                                                |
| axe in Playwright (Chromium) | `e2e/accessibility.spec.ts`                              | WCAG 2.2 A and AA rules, colour contrast included, on the setup form (empty and with errors), the plan and each category tab, the forecast table, both dialogs with answers, and the plan in Hindi, all in light and dark |
| Keyboard only                | `e2e/keyboard.spec.ts`                                   | Skip link, setup, plan tabs with arrow keys, chat dialog, Esc and focus return, focus trap in both directions, visible focus at each step                                                                                 |
| Phone size                   | `e2e/mobile.spec.ts`                                     | 375 × 812 and 390 × 844 viewports: no sideways scrolling and no control or standalone link smaller than 44 × 44 px                                                                                                        |
| Focus and live regions       | `app.test.tsx`, `dialog.test.tsx`, `setup-form.test.tsx` | Focus on first load and on screen changes, dialog focus handling, announcements                                                                                                                                           |

## Manual checks

- Visual pass in Chromium at desktop width (dark theme) and at 375 × 812 (light theme) with live
  data for Delhi: layout, contrast and wrapping of long Hindi and AI text.

## Known gaps

- No screen-reader session (NVDA, TalkBack or VoiceOver) has been recorded yet; the checks above
  are automated or visual.
- Read-aloud depends on the voices installed on the device; where no Hindi voice exists, the
  browser chooses its own fallback.
