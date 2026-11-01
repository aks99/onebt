import { PRICING, PRODUCT_NAME, THE_PROMISE } from "@/lib/product";

// Placeholder landing page. The full S0.1 layout arrives in step 2 (design system) and step 5.
export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px" }}>
      <h1 className="t-display">{PRODUCT_NAME}</h1>
      <p className="t-lede">One idea. One stage. A system for getting there.</p>
      <p>Find the right independently organized TEDx events, write the application, write the talk, memorize it, and launch it.</p>
      <p>No card. No recording. Nobody can promise you a stage.</p>
      <p>
        Founding Member: ${PRICING.founding.monthly} a month, ${PRICING.founding.sixMonth} for six months, ${PRICING.founding.twelveMonth} for twelve months.
        Price kept for life while active. {PRICING.founding.seats} founding seats. After that, ${PRICING.regular.monthly} a month.
      </p>
      <p style={{ background: "var(--surface-2)", padding: 16, borderRadius: "var(--radius-card)" }}>{THE_PROMISE}</p>
    </main>
  );
}
