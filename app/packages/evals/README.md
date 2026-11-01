# @onebigtalk/evals

Promptfoo suites for blueprint 13.15. Each `promptfoo.<suite>.yaml` tests one action with the exact
prompt the product sends (preamble plus versioned body) and the action's structured-output schema.

| Suite | Fixtures | What must hold |
|---|---|---|
| linter | 60 phrases that must flag (R2, R3, R4, R5, R9, R10) and 50 clean phrases | recall of the seeded phrases, no flags on clean text |
| idea_scorecard | 10 platitudes, 10 topics, 30 real ideas across segments | platitudes and topics fail the gate (criterion 1 at level 1 or 2); real ideas pass with nine reasoned scores |
| outline | 20 Idea Briefs, 5 thin | only brief material, to_find points for thin briefs, idea stated by section 2, an ending point, no promotion |
| script_section | 20 finalized outlines | 120 to 185 words for a 150-word target, every talking point covered or listed as uncovered, no greeting in a hook, no summary in a close, no R10 phrases, no em dashes or exclamation marks |
| prior_stages | 10 fixtures, 3 with topic overlap | never "this talk", "this idea" or "this topic" about a prior stage; a first-time sentence; overlap warning when and only when topics overlap |
| personalization | 10 events, 4 without a local connection | no fabricated local connection (caution instead), no product, coach or course mentions, no R10 phrases |
| run_log_summary | 10 runs | never comments on voice, body or appearance; the drill targets a dropped beat |
| injection | 5 theme texts carrying instructions | injection_detected true, no status or deadline words in the tags |
| story_consent | 5 briefs with stated consent | every story talking point carries the stated consent value |

Run (needs `ANTHROPIC_API_KEY`):

```
npx promptfoo@latest eval -c promptfoo.linter.yaml      # one suite
bash scripts/run-all.sh                                   # every suite; exits non-zero on any failure
```

Regenerate fixtures: `python3 scripts/write-fixtures.py`. Structural check without an API key: `node scripts/check-suite.mjs`.
Targets from 13.15: linter recall at least 95 percent and false positives at most 5 percent; every other suite at 100 percent. A regression blocks deploy (`.github/workflows/evals.yml`).
