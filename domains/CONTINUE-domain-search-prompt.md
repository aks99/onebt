# Prompt to continue the domain-name search in another Claude window

Paste everything between the lines as the first message. Attach or connect the folder `G:\TEDx OS\domains\` (it holds `shortlist-available-scored.csv`, `Domain-Names-Shortlist-and-Stories.md`, `candidates-expireddomains-T-to-O.csv`, `rdap-checks-so-far.csv`).

---

You are continuing a domain-name search for a web app that guides experts, coaches and authors through getting onto an independently organized TEDx stage (finding events, applying, writing the talk, memorizing it, launching it). Read `Domain-Names-Shortlist-and-Stories.md` and `shortlist-available-scored.csv` in the attached folder first; they hold 150 names already confirmed available and the scoring rubric.

THE BRIEF
- .com only; 5 or 6 letters; letters only (no numbers, no hyphens); ending in O so it feels like a word (Tetmo, Namlo); starting with T preferred; memorable; a story that attaches it to the TEDx stage without saying TEDx; sounding near "Ted" is a bonus but it must not contain T-E-D, because TED Conferences enforces its marks and "Tedmo"-style names would draw a letter.

WHAT IS ALREADY KNOWN (do not repeat these checks)
- Every pronounceable 5-letter T...O name I tried is registered (about 110: Talko, Tenzo, Temzo, Tezmo, Tanzo, Tarvo, Talvo, Tilvo, Trevo, Tromo, Tyzlo, Tyrvo and so on). Only odd 5-letter shapes are free (Tozyo, Tuzyo).
- Common 6-letter Italian/Spanish/Japanese shapes are registered (Tavero, Tenoro, Tamiro, Temiro, Terso, Trenzo, Tempio, Talkio, Talkyo, Tempyo, Thinko, Thinqo, Twinio, Theomo).
- Free shapes: Y in position 2 (Tylano, Tymoro, Tymiro, Tynemo, Tykero), U in the middle (Tahuno, Tenuzo, Tezuko), TH/TW clusters (Thrulo, Thrano, Twanzo), Tez- openings (Tezmio, Tezlio).
- Do NOT use ExpiredDomains.net's member area with any automation; their rules close the account for any tool or agent, and the owner's account was already disabled once this way. If the owner wants ExpiredDomains data, they browse it themselves and paste names to you.

HOW TO CHECK AVAILABILITY (the method that works and breaks no rules)
- Use the .com registry's public RDAP lookup: GET https://rdap.verisign.com/com/v1/domain/NAME.com with header Accept: application/rdap+json. HTTP 404 means not registered (available to register); 200 means registered. Check one name at a time with at least 600 ms between requests; stop and wait if you ever see 429.
- If you have a browser tool, open https://rdap.verisign.com/com/v1/domain/example.com once, then run small fetch loops (30 names, 600 ms apart, under 40 seconds per call) from that page and store results in window.__r. If you have a shell with internet access, curl the same URLs with a 0.7 s sleep. If neither can reach the registry, hand the owner a list of 50 names to paste into a registrar's bulk search (Namecheap "Beast Mode" or Porkbun bulk) and score what comes back.

WHAT TO DO NOW
1. Generate 300 new candidates in the shapes that are still free, with a T start and an O end, 6 letters, and run the availability check. Aim for names that carry a story: hidden words (hero, line, tomorrow, ten, true, tribe, through), Spanish/Italian/Latin/Japanese fragments with a meaning, and the Tez-/Ten-/Tem- openings for the Ted rhythm. Avoid double-letter oddities, -ao/-eo/-uo endings and anything with X or Q unless it is clearly better than the current top 12.
2. Score every available name out of 100: 30 say-ability (one way to say it in any accent), 25 memorability, 20 story fit to the stage moment, 15 spell-from-hearing, 10 Ted-adjacent rhythm without legal risk. Merge into `shortlist-available-scored.csv` (same columns), keep it sorted by score, and keep the date of each registry check.
3. For every name that scores 60 or more, write a brand story in the format used in `Domain-Names-Shortlist-and-Stories.md`: how to say it, the one-sentence meaning, the story, and the line that attaches it to an independently organized TEDx stage. Update that file's Top 12 if anything beats the current list (Tylano 72, Thrulo 70, Tymoro 70, Tymiro 70, Tynemo 66, Tejiro 66, Tykero 66, Thrano 64).
4. Save the updated CSV and the stories file back into the folder, and give the owner a short message with the new top 5 and what changed.

HOUSE STYLE
Plain, warm, direct. No em dashes, no exclamation marks, no buzzwords. Never write "TED talk" for a TEDx talk; say "an independently organized TEDx stage". Never promise selection.

---
