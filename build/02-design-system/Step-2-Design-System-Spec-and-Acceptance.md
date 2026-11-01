# Step 2: Design system. Specification, deliverables and acceptance report

Date: 1 November 2026. Blueprint v1.7 Sections 11.2 to 11.7; runbook step 2: design tokens, type scale, core components, automated contrast checks, and a check that no component requests camera or microphone.

## 1. What was built

| Path | What it is |
|---|---|
| `app/packages/ui/tokens/tokens.json` | The single source of truth for the palette "Ink and Ivory" (light and dark), the contrast requirements, the type scale, font stacks, radius, spacing and layout widths |
| `app/packages/ui/scripts/build-tokens.mjs` | Generates `dist/tokens.css`: every semantic token in hex and OKLCH for `:root` (light) and `.dark`, shadcn/ui aliases (`--background`, `--card`, `--muted`, `--border`, `--input`, `--ring`, `--primary`, `--destructive`, `--chart-1..5`), font variables, spacing, the type scale as `.t-*` classes, focus ring, reduced-motion rule |
| `app/packages/ui/scripts/check-contrast.mjs` | WCAG 2.x check of 45 token pairs (text at 4.5:1, UI and focus at 3:1) in both themes plus the prompter pair; non-zero exit on any failure |
| `app/packages/ui/scripts/check-no-capture.mjs` | Scans `packages/ui` and `apps/web` for `getUserMedia`, `MediaRecorder`, `navigator.mediaDevices`, `SpeechRecognition`, `AudioContext`, `<audio>`, `<video>`, `<input capture>`, audio or video accept types, media file extensions and speech vendors; non-zero exit on any hit |
| `app/packages/ui/src/primitives.tsx` | Button (primary, secondary, milestone gold, ghost, danger for errors only; loading; 24 px minimum target), Card (milestone variant), StatusBadge (every pipeline status with a glyph and a label, never colour alone), RubricChip (Level 1 to 4 with the quoted standard), LinterFlag (rule, quote, why, fix, Use this), ProgressRing, WeekDots |
| `app/packages/ui/src/patterns.tsx` | DeadlineChip (days left, date, verified date and source type, date-only when the timezone is unknown, hidden variant for the free plan), AIDraftBlock (label beside the content, Why this, versions, regenerate with steer chips, thinking or writing state with Stop, Not right), GateNotice (inline, three founding prices or the $97 regular price depending on seats, 3-day trial, Not now, the promise line; exhausted variant), AllowanceMeter (plain words, 80% courtesy, exhausted), CharCountField (live counter that explains why Save is disabled; thin chip), EmptyState (path strip with the first node unlocked and one two-minute action) |
| `app/packages/ui/src/deliver.tsx` | BeatRow (first three words in Newsreader, purpose, budget, four-step mastery dots, due date, stage note), DrillCard (read-cover-recite, cue cards, blank-fill with deterministic masking at 10, 30, 60 percent, chaining; Got it G and Missed M targets at 56 px; Reveal R), PracticeTimer (count-up and count-down, 6-minute checkpoint ticks, two ending markers, the beat the member should be on, space to pause, Esc to leave, Finish saves duration and beat reached; `requestAnimationFrame` driven; reduced-motion aware) |
| `app/apps/web/app/dev/components/page.tsx` | Preview page rendering every component in its states, with a light and dark toggle. Built and screenshot: `preview-light.png`, `preview-dark.png` in this folder |
| `app/apps/web/app/styles/globals.css` | Tailwind v4 with the ui package as a source, the tokens, font aliases |

## 2. Decisions the blueprint did not settle (Appendix C, v1.7)

1. **Dark-theme danger solid corrected to #EB5A5E.** The blueprint listed #E5484D with ink text at 4.78:1; the checker measures 4.44:1, below 4.5. #EB5A5E measures 5.09:1 with ink text. Light theme unchanged. Danger stays an error colour only, never brand.
2. **A preview page stands in for Storybook in the first release.** `/dev/components` renders every component in its states and is screenshot in both themes. The acceptance check "every screen renders all five states" is met per component here and per screen in steps 5 to 10.
3. **Tailwind v4 utilities reference tokens as CSS variables** (`bg-[var(--surface)]`), so a theme change is a token change, never a class change. The shadcn aliases exist for shadcn components added later; aliases identical to a token name are skipped so no variable references itself.
4. **Components carry their accessibility in the markup**: every status has a glyph and text, rubric chips expose the standard to screen readers, meters are `progressbar`s, the timer is `role="timer"`, drills answer to the G, M and R keys as well as to clicks, and buttons never fall below 24 by 24 px.

## 3. Contrast report (both themes; all pairs pass)

| Theme | Kind | Foreground | Background | Ratio | Result |
|---|---|---|---|---|---|
| light | text | text | bg | 16.40 | pass |
| light | text | text | surface | 17.38 | pass |
| light | text | text | surface-2 | 15.05 | pass |
| light | text | text-secondary | bg | 8.41 | pass |
| light | text | text-secondary | surface | 8.91 | pass |
| light | text | text-muted | bg | 5.09 | pass |
| light | text | text-muted | surface | 5.40 | pass |
| light | text | primary-foreground | primary | 16.40 | pass |
| light | text | accent-foreground | accent-solid | 7.56 | pass |
| light | text | accent-text | bg | 5.54 | pass |
| light | text | accent-text | surface | 5.87 | pass |
| light | text | success-text | bg | 6.17 | pass |
| light | text | warning-text | bg | 5.54 | pass |
| light | text | danger-text | bg | 6.67 | pass |
| light | text | danger-foreground | danger-solid | 5.44 | pass |
| light | text | ai-text | ai-bg | 6.59 | pass |
| light | text | ai-text | surface | 7.76 | pass |
| light | ui | border-strong | bg | 3.94 | pass |
| light | ui | input | surface | 4.17 | pass |
| light | ui | focus | bg | 5.40 | pass |
| light | ui | focus | surface | 5.72 | pass |
| light | ui | accent-outline | bg | 3.73 | pass |
| dark | text | text | bg | 16.35 | pass |
| dark | text | text | surface | 15.17 | pass |
| dark | text | text | surface-2 | 13.55 | pass |
| dark | text | text-secondary | bg | 10.59 | pass |
| dark | text | text-secondary | surface | 9.83 | pass |
| dark | text | text-muted | bg | 7.38 | pass |
| dark | text | text-muted | surface | 6.85 | pass |
| dark | text | primary-foreground | primary | 16.35 | pass |
| dark | text | accent-foreground | accent-solid | 9.16 | pass |
| dark | text | accent-text | bg | 11.38 | pass |
| dark | text | accent-text | surface | 10.56 | pass |
| dark | text | success-text | bg | 9.96 | pass |
| dark | text | warning-text | bg | 11.38 | pass |
| dark | text | danger-text | bg | 7.89 | pass |
| dark | text | danger-foreground | danger-solid | 5.09 | pass |
| dark | text | ai-text | ai-bg | 7.89 | pass |
| dark | text | ai-text | surface | 8.17 | pass |
| dark | ui | border-strong | bg | 3.48 | pass |
| dark | ui | input | surface | 3.23 | pass |
| dark | ui | focus | bg | 8.76 | pass |
| dark | ui | focus | surface | 8.13 | pass |
| dark | ui | accent-outline | bg | 9.87 | pass |
| prompter | text | text | bg | 18.34 | pass |


## 4. Acceptance report

| Check | Result |
|---|---|
| Tokens generated for light and dark with OKLCH values and shadcn aliases | pass (`dist/tokens.css`) |
| 45 contrast pairs at WCAG 2.2 AA in both themes | pass, 0 failures (after the dark danger correction) |
| No component or page references camera, microphone, recording, transcription or media upload | pass (`check-no-capture.mjs` clean) |
| Every page sends `Permissions-Policy: camera=(), microphone=(), display-capture=()` | pass (header observed on the running app; `document.featurePolicy.allowsFeature("microphone")` is false) |
| Copy lint (no em dashes, exclamation marks or banned phrases in `apps/`) | pass |
| TypeScript typecheck of `packages/ui` and `apps/web` | pass |
| Production build of `apps/web` including the preview page | pass (Next.js 15.5, static) |
| Preview renders every component in both themes | pass (screenshots in this folder) |
| Drill targets at least 24 by 24 px with 8 px spacing | pass (56 px targets, 16 px gap) |
| Reduced motion disables the checkpoint pulse and all transitions | pass (media query in tokens.css and the `reducedMotion` prop) |

Not in this step: Tiptap editor nodes (step 8), Kanban and data table (step 7), outline card (step 8), dialogs and toasts (added with the first screen that needs them), print stylesheet (step 9).

## 5. What step 3 needs from here

Nothing blocks. Step 3 builds auth, memberships, Stripe billing, the founding counter and trial limits, allowances and the credit ledger service on top of the step-1 schema, using Button, Card, GateNotice and AllowanceMeter from this package.
