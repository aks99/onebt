# VERIFICATION CHECKLIST (the mandatory gate)

Run by a reviewer that did not write the document: a subagent given only the document and the notes folder, or the author in a fresh pass that reads nothing else. No web access during verification; the question is whether the document matches the evidence it claims to rest on.

## Brief for the reviewer (copy)

```
You are an independent fact-checker and consistency reviewer. You have not seen how this document was written. Find errors; do not praise.
Document: {path}. Source of truth: the research notes in {folder}. Use only those.
1. FACT CHECK: for every specific number, price, date, quote, named claim, hex value, API price or statute detail in the document, grep the notes to confirm it. Report each discrepancy as: Line | claim | what the notes say | severity (High: a wrong fact a builder would act on; Medium: mis-citation, overstatement, contradiction with the notes; Low: rounding, wording). Labelled decisions and assumptions are not errors.
2. INTERNAL CONSISTENCY: tier names and prices, allotments, feature IDs, stage numbers, pillar names, placeholder product name, model routing, cross-reference section numbers, targets that appear in more than one place.
3. RULE COMPLIANCE: no outcome promises outside quoted or competitor contexts; no em dashes; no banned words; required disclaimers present; owner credential rules obeyed.
4. GAPS: claims that look sourced but have no matching appendix entry; appendix entries whose URL is not in the notes; unnumbered appendix blocks.
Write the full report to {report path}; return a summary under 400 words with severity counts.
```

## What the author does with the report
1. Fix every High and Medium finding in the source parts, not only in the joined file.
2. Fix Low findings that take under a minute; log the rest in the decision log as accepted.
3. Re-join the document and re-run automated checks (word count, em-dash count, banned-word scan, citation-key existence).
4. Save the report beside the document with the same version number.
5. If the reviewer found any High finding, re-run the fact check on the corrected section before shipping.

## Automated checks (run before and after verification)
- `grep -c "—"` must return 0.
- Banned-word scan (see STYLE_GUIDE) returns only legitimate uses (for example the word inside the list of banned words).
- Every `[A<n>]` key in the text exists as `- A<n>` in the appendix.
- Every feature ID in the phase lists exists in a feature table, and every V2 feature appears in some phase.
- Tier prices and allotments appear identically in Section 1, Section 10 and any later mention (grep the numbers).

## Severity calibration (from the worked case)
High: none found (a wrong price or rule a builder would act on).
Medium: citation ranges pointing at the wrong appendix entries; an overstatement ("comparable services avoid the mark entirely" when the document's own table shows some do not); stating as a rule something the notes flag as unconfirmed; a regional price descriptor whose arithmetic does not match the chosen prices.
Low: $797 vs $799; a vocabulary label presented as a quote; a 2023 price stated without its date; $0.10 vs $0.077 per unit; one tool outside a stated price range.
