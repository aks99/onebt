import type { Metadata } from "next";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "Find one idea worth spreading, apply to the right independently organized TEDx events, write the talk in your words, know it cold, and launch it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer style={{ fontSize: 12, lineHeight: "16px", padding: "24px 16px", color: "#5F6B7E", background: "#FBF8F3" }}>
          <p>{DISCLAIMER}</p>
        </footer>
      </body>
    </html>
  );
}
