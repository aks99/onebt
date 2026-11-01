"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@onebigtalk/ui";
import { PRODUCT_NAME } from "@/lib/product";

// Navigation (5.2): a left rail with five top-level items on desktop, a bottom tab bar on phones
// (Today, Journey, Find, Write, Practice; Me in the header). Built phone-first: 16px gutters, 44px targets,
// no horizontal scroll. The rail shows under md (768px) as tabs.

interface Item { href: string; label: string; short: string; glyph: string }
const ITEMS: Item[] = [
  { href: "/today", label: "Today", short: "Today", glyph: "◎" },
  { href: "/journey", label: "Journey", short: "Journey", glyph: "⟶" },
  { href: "/find/idea-lab", label: "FIND", short: "Find", glyph: "◇" },
  { href: "/write/brief", label: "WRITE", short: "Write", glyph: "✎" },
  { href: "/deliver/memorize", label: "DELIVER", short: "Practice", glyph: "▷" },
  { href: "/amplify/launch", label: "AMPLIFY", short: "Amplify", glyph: "↗" },
];
const SUB: Record<string, { href: string; label: string }[]> = {
  "/find": [
    { href: "/find/idea-lab", label: "Idea Lab" }, { href: "/find/events", label: "Event Finder" }, { href: "/find/targets", label: "Targets" },
    { href: "/find/applications", label: "Applications" }, { href: "/find/pitch", label: "Pitch Pack" }, { href: "/find/prior-stages", label: "Prior Stages" },
  ],
  "/write": [{ href: "/write/brief", label: "Idea Brief" }, { href: "/write/outline", label: "Outline" }, { href: "/write/script", label: "Script Studio" }, { href: "/write/factcheck", label: "Fact-check" }],
  "/deliver": [{ href: "/deliver/memorize", label: "Memorize" }, { href: "/deliver/timer", label: "Practice timer" }],
  "/amplify": [{ href: "/amplify/launch", label: "Launch plan" }],
};

function activeFor(path: string, item: Item) {
  const root = "/" + item.href.split("/")[1];
  return path === item.href || path.startsWith(root + "/") || path === root;
}

export function AppShell({ children, talkTitle, rings, staff }: { children: React.ReactNode; talkTitle?: string | null; rings?: Partial<Record<"find" | "write" | "deliver" | "amplify", number>>; staff?: boolean }) {
  const path = usePathname() ?? "";
  const section = "/" + path.split("/")[1];
  const sub = SUB[section];
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--surface)] focus:p-2">Skip to content</a>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 md:pl-[calc(var(--rail)+16px)]">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/today" className="t-title md:hidden">{PRODUCT_NAME}</Link>
          {talkTitle && <span className="t-compact truncate text-[var(--text-secondary)]">Talk: {talkTitle}</span>}
        </div>
        <Link href="/me/plan" className="flex h-11 min-w-11 items-center justify-center rounded-[var(--radius)] px-3 t-compact hover:bg-[var(--surface-2)]" aria-label="Me: profile, plan and settings">Me</Link>
      </header>

      {/* Desktop rail */}
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail)] flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] p-3 md:flex">
        <Link href="/today" className="t-title mb-6 block px-2 pt-2">{PRODUCT_NAME}</Link>
        {ITEMS.map((it) => {
          const active = activeFor(path, it);
          const ringKey = it.href.split("/")[1] as keyof NonNullable<typeof rings>;
          const ring = rings?.[ringKey];
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
              className={cx("mb-1 flex h-11 items-center justify-between rounded-[var(--radius)] px-3 t-body", active ? "bg-[var(--surface-2)] font-medium" : "hover:bg-[var(--surface-2)]")}>
              <span className="flex items-center gap-2"><span aria-hidden>{it.glyph}</span>{it.label}</span>
              {typeof ring === "number" && <span className="t-metadata tabular text-[var(--text-muted)]" aria-label={`${ring}% complete`}>{ring}%</span>}
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col gap-1">
          {(staff || path.startsWith("/curate") || path.startsWith("/admin")) && <Link href="/curate" aria-current={path.startsWith("/curate") ? "page" : undefined} className={cx("flex h-11 items-center rounded-[var(--radius)] px-3 t-body", path.startsWith("/curate") ? "bg-[var(--surface-2)] font-medium" : "hover:bg-[var(--surface-2)]")}>Curator Console</Link>}
          <Link href="/me/plan" className="flex h-11 items-center rounded-[var(--radius)] px-3 t-body hover:bg-[var(--surface-2)]">Me</Link>
        </div>
      </nav>

      {/* Section sub-navigation (scrolls sideways on phones, never the page) */}
      {sub && (
        <nav aria-label="Section" className="border-b border-[var(--border-subtle)] bg-[var(--surface)] md:pl-[var(--rail)]">
          <ul className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
            {sub.map((s) => (
              <li key={s.href} className="shrink-0">
                <Link href={s.href} aria-current={path.startsWith(s.href) ? "page" : undefined}
                  className={cx("flex h-10 items-center rounded-[var(--radius)] px-3 t-compact", path.startsWith(s.href) ? "bg-[var(--surface-2)] font-medium" : "hover:bg-[var(--surface-2)]")}>{s.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main id="main" className="mx-auto w-full max-w-[var(--content-max)] px-4 pb-24 pt-6 md:pb-10 md:pl-[calc(var(--rail)+24px)] md:pr-6">{children}</main>

      {/* Phone tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border-subtle)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {ITEMS.slice(0, 5).map((it) => {
          const active = activeFor(path, it);
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
              className={cx("flex h-14 flex-col items-center justify-center gap-0.5 t-metadata", active ? "text-[var(--text)] font-medium" : "text-[var(--text-secondary)]")}>
              <span aria-hidden className="text-[18px] leading-none">{it.glyph}</span>{it.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
