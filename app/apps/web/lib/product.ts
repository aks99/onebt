// The product name lives here and nowhere else. Changing the name is one edit (blueprint 2.4, v1.3).
export const PRODUCT_NAME = "One Big Talk";
export const PRODUCT_DOMAIN = "onebigtalk.com";

// Text in blueprint Section 2.4. Shown in every public footer, in onboarding and on the pricing page.
export const DISCLAIMER =
  `${PRODUCT_NAME} is an independent product and is not affiliated with, endorsed by, or sponsored by TED Conferences, LLC. ` +
  `TED and TEDx are trademarks of TED Conferences, LLC. TEDx events are independently organized under license from TED. ` +
  `${PRODUCT_NAME} never charges for, sells, or guarantees speaking slots.`;

// The only promise (blueprint 10.5). Never paraphrase it in public copy.
export const THE_PROMISE =
  "We do not guarantee that any organizer will choose you. Nobody can. One promise: if you submit 100 ready applications " +
  "through the app and are not chosen for a TEDx stage, send us the proof and we extend your access free for as long as you keep " +
  "applying with ready applications every week.";

// Pricing (blueprint 10.2; owner decisions of 31 Oct and 1 Nov 2026). USD only.
export const PRICING = {
  founding: { monthly: 17, sixMonth: 77, twelveMonth: 147, seats: 30 },
  regular: { monthly: 97 },
  addons: { applicationReview: 497, scriptReview: 497, slaBusinessDays: 5 },
  trial: { days: 3, ideas: 1, events: 3 },
} as const;

// Credential lines (owner decision 31 Oct 2026). Never both on one page.
export const CREDENTIAL = { joint: "10X TEDx Speakers", ashSolo: "9X TEDx" } as const;

// Words that never appear in product copy are listed in tools/copy-lint/check.mjs and enforced in CI (blueprint 11.9).
