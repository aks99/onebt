# Speaker Page: a separate project proposal (31 October 2026)

**Status:** proposal for a stand-alone product, split out of the TEDx OS blueprint at Ash's request. Nothing here is in the TEDx OS build. It can share accounts and design tokens with TEDx OS later, or run entirely on its own.

## 1. The problem it solves

Organizers find many speakers through visibility, not forms: "the organizer had read his blog for years"; "organizers found her through the videos on her website and YouTube channel"; "recruited via Facebook Messenger after seeing her speak online." Application forms ask for a bio, a one-sentence idea, prior speaking, links and often a short video. Most experts have none of this in one place; their LinkedIn is a résumé and their website is a sales page. A Speaker Page is the one public page that answers an organizer's question in 40 seconds: who is this, what is the one idea, can they hold a room, how do I reach them.

Existing products: SpeakerHub (free to $349.90 a year) and SpeakerMatch ($30–$80 per four weeks) offer directory profiles aimed at paid gigs, with one-sheets and lead feeds; neither is built around a single idea, neither follows TEDx's content rules, and both read as marketplaces.

## 2. What it is

A hosted public page per speaker at a memorable URL, built for idea stages (independently organized TEDx events first, then conferences, podcasts and associations):

- **Above the fold:** name, headshot, the one-sentence idea (≤15 words), the "why now" paragraph (≤80 words), a 90-second idea video embedded from the speaker's own YouTube or Vimeo (never uploaded to us), city and travel radius.
- **Below:** a 150-word bio written to answer "why trust this person," prior stages listed with month, city, organization, audience size and topic (the TEDx OS Prior Stages rules apply: experience on other topics; this idea is fresh), topics the speaker can be interviewed on, press and links, a contact method of the speaker's choosing (form, email or booking link), and the required phrasing for any TEDx mention ("spoke at TEDxCity 20xx, an independently organized TEDx event"; no TED logo).
- **Formats:** web page, a one-sheet PDF generated from the same data, and an "embed card" for LinkedIn featured sections and email signatures.
- **Privacy:** the speaker chooses public, unlisted (link only) or private; search-engine indexing is opt-in.

What it is not: a marketplace, a directory that routes organizers to speakers through us, a place that sells slots or promises selection. Organizers are never contacted by the product. A directory listing (opt-in, searchable by topic and city) can be a later phase and must be reviewed against TED's rules before launch because a "find TEDx speakers here" service invites the same trademark and pay-to-play scrutiny the blueprint describes.

## 3. Who it is for

The same buyer as TEDx OS (experts, coaches, consultants, authors, clinicians, academics), plus anyone who gets invited to speak and needs one link to send. It is the natural first purchase for people who are not ready for the full TEDx OS journey, and the natural "forever" asset after a talk is published.

## 4. Features (MVP and later)

| ID | Feature | MVP | Later |
|---|---|---|---|
| SP1 | Page builder from a short form (idea, bio, prior stages, video link, contact) with AI help for the idea sentence and bio, obeying the no-selling and fresh-idea rules | ✓ | |
| SP2 | Three themes using the Ink & Ivory tokens from the TEDx OS design system (no red, no Helvetica) | ✓ | |
| SP3 | Custom slug on the product domain; custom domain mapping | ✓ (slug) | ✓ (domain) |
| SP4 | One-sheet PDF and embed card generated from the page | ✓ | |
| SP5 | Visibility controls (public, unlisted, private) and opt-in indexing | ✓ | |
| SP6 | Prior-stages module with the strong-candidate framing and the fresh-idea check (shared with TEDx OS) | ✓ | |
| SP7 | Analytics: views, link clicks, contact submissions | ✓ | |
| SP8 | Published-talk section: official TEDx YouTube embed via the TED-compliant link, title, description, stats | | ✓ |
| SP9 | Topic directory (opt-in), city and topic search, organizer-facing view with no messaging | | ✓ (after legal review) |
| SP10 | Import from and export to TEDx OS (idea, bio, prior stages) | | ✓ |

No audio or video is recorded or stored by the product; videos are embeds of the speaker's own hosted links.

## 5. Monetization (decision for Ash)

- **Free:** one page, product slug, product branding in the footer, unlisted or public.
- **Paid:** $9 a month or $79 a year: custom domain, no footer branding, one-sheet and embed card, analytics, three themes, published-talk section.
- **Bundle:** included free for TEDx OS Founding Members (twelve-month plan) as a retention and acquisition lever; or sold as a $29 add-on inside the ABB challenge.
- Comparable prices: SpeakerHub Silver $149.99 a year; SpeakerMatch Silver $325 a year; Carrd and Linktree-style page builders $5–$12 a month.

## 6. Technology

Next.js on Vercel with static generation per page (fast, cheap, good for SEO), Supabase for accounts and data (shared project or a separate one), Satori or `@vercel/og` for the embed card and social preview images, `@react-pdf/renderer` for the one-sheet, Claude Haiku/Sonnet for the idea sentence and bio help (about $0.03 per page), Paddle or Stripe for billing. Effort: 4–6 person-weeks for the MVP. Monthly infrastructure under $100 until tens of thousands of pages.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Reads as a TEDx marketplace | No organizer messaging, no "find speakers" promise, no TED marks, the standard disclaimer, legal review before any directory |
| Thin pages that embarrass the speaker | The form enforces the one-sentence idea and a minimum bio; AI help follows the TEDx OS rubrics |
| Spam or fake pages | Email verification, manual review of public pages in the first months, a report button |
| Cannibalizes TEDx OS | Position as the public asset; the journey (events, applications, writing, memorization) stays in TEDx OS; bundle rather than compete |

## 8. Decision needed

Proceed as a separate product (own name, own pricing) or as a feature of TEDx OS later. Recommendation: separate, small, fast, launched to the challenge audience as the "one link to send when someone asks you to speak," with the TEDx OS bundle as the bridge between the two.
