import type { Metadata } from "next";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "Find one idea worth spreading, apply to the right independently organized TEDx events, write the talk in your words, know it cold, and launch it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body>
        {children}
        <footer className="t-metadata" style={{ padding: "24px 16px", color: "var(--text-muted)", background: "var(--bg)" }}>
          <p>{DISCLAIMER}</p>
        </footer>
      </body>
    </html>
  );
}
