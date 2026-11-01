import Link from "next/link";
import { Card, cx } from "@onebigtalk/ui";
import { requireCurator } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadServiceAccount } from "@/lib/catalogue/sheets";
import { DedupPanel, DiffPanel, OrganizersPanel, SourcesPanel, TagsPanel, TicketsPanel, VerifyPanel, type DedupRow, type DiffRow, type OrganizerRow, type TagRow, type TicketRow, type VerifyRow } from "@/components/curate/CuratorControls";

export const dynamic = "force-dynamic";

const TABS = [["sources", "Sources"], ["runs", "Import runs"], ["diff", "Diff"], ["verify", "Verify"], ["dedup", "Dedup"], ["organizers", "Organizers"], ["tickets", "Tickets"], ["tags", "Tags"]] as const;
type Tab = typeof TABS[number][0];

// S8.3 Curator Console: turn the owner's sheet and crawler files into a verified catalogue. Role-gated
// (curator or admin); the service role reads here because curators see across members' interest counts only
// as numbers, never as names. Tabs are URL state so each one is linkable and the page stays light on phones.
export default async function CuratePage({ searchParams }: { searchParams: Promise<{ tab?: string; run?: string }> }) {
  await requireCurator();
  const sp = await searchParams;
  const tab = (TABS.some(([k]) => k === sp.tab) ? sp.tab : "sources") as Tab;
  const db = supabaseAdmin();
  const [{ data: source }, { data: runs }, { data: counts }] = await Promise.all([
    db.from("import_sources").select("*").eq("kind", "google_sheet").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("crawler_runs").select("*").order("started_at", { ascending: false }).limit(12),
    db.from("public_counts").select("*").maybeSingle(),
  ]);
  const { count: pendingCount } = await db.from("import_diffs").select("id", { count: "exact", head: true }).eq("status", "pending");
  const { count: queueCount } = await db.from("verify_queue").select("id", { count: "exact", head: true });
  const { count: ticketCount } = await db.from("event_reports").select("id", { count: "exact", head: true }).eq("status", "open");
  const badge: Partial<Record<Tab, number | null>> = { diff: pendingCount, verify: queueCount, tickets: ticketCount };
  const latestRun = sp.run ?? runs?.[0]?.id ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="t-page-title">Curator Console</h1><p className="t-compact text-[var(--text-secondary)]">{counts?.open_calls ?? 0} open calls published to members. The app never crawls; it reads what you maintain.</p></div>
        <Link href="/find/events" className="t-compact underline">See the Event Finder as a member</Link>
      </div>
      <nav aria-label="Console tabs" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex gap-1">
          {TABS.map(([k, label]) => (
            <li key={k} className="shrink-0"><Link href={`/curate?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cx("flex h-10 items-center gap-1 rounded-[var(--radius)] px-3 t-compact", tab === k ? "bg-[var(--surface-2)] font-medium" : "hover:bg-[var(--surface-2)]")}>{label}{badge[k] ? <span className="rounded-full bg-[var(--accent-solid)] px-1.5 text-[11px] text-[var(--accent-foreground)] tabular">{badge[k]}</span> : null}</Link></li>
          ))}
        </ul>
      </nav>

      {tab === "sources" && <SourcesPanel source={source as any} serviceAccountEmail={loadServiceAccount()?.client_email ?? source?.service_account_email ?? null} />}

      {tab === "runs" && (
        <Card className="flex flex-col gap-2">
          <h2 className="t-section">Import runs</h2>
          {!runs?.length ? <p className="t-compact text-[var(--text-secondary)]">Connect the Google Sheet or import the first crawler run.</p> : (
            <div className="overflow-x-auto"><table className="w-full t-compact"><thead><tr className="text-left text-[var(--text-muted)]"><th className="py-1 pr-3">Run</th><th className="pr-3">Kind</th><th className="pr-3 tabular">Total</th><th className="pr-3 tabular">New</th><th className="pr-3 tabular">Changed</th><th className="pr-3 tabular">Unchanged</th><th className="pr-3 tabular">Expired</th><th className="pr-3 tabular">Errors</th><th>Diff</th></tr></thead>
              <tbody>{runs.map((r) => <tr key={r.id} className="border-t border-[var(--border-subtle)]"><td className="py-1 pr-3">{new Date(r.started_at).toLocaleString("en-GB")} {r.run_label ? `· ${r.run_label}` : ""}</td><td className="pr-3">{r.kind === "google_sheet" ? "sheet" : "upload"}</td><td className="pr-3 tabular">{r.rows_total}</td><td className="pr-3 tabular">{r.rows_new}</td><td className="pr-3 tabular">{r.rows_changed}</td><td className="pr-3 tabular">{r.rows_unchanged}</td><td className="pr-3 tabular">{r.rows_expired}</td><td className="pr-3 tabular">{r.rows_error}</td><td><Link className="underline" href={`/curate?tab=diff&run=${r.id}`}>open</Link></td></tr>)}</tbody></table></div>
          )}
          {runs?.[0]?.report && ((runs[0].report as any).problems?.length > 0 || (runs[0].report as any).columnProblems?.length > 0) && (
            <details className="t-compact"><summary className="cursor-pointer">Problems in the latest run</summary>
              <ul className="list-disc pl-5">{((runs[0].report as any).columnProblems ?? []).map((p: string, i: number) => <li key={`c${i}`}>{p}</li>)}{((runs[0].report as any).problems ?? []).slice(0, 50).map((p: any, i: number) => <li key={i}>row {p.row} ({p.key}): {p.problem}</li>)}</ul></details>
          )}
        </Card>
      )}

      {tab === "diff" && <DiffTab db={db} runId={latestRun} />}
      {tab === "verify" && <VerifyTab db={db} />}
      {tab === "dedup" && <DedupTab db={db} />}
      {tab === "organizers" && <OrganizersTab db={db} />}
      {tab === "tickets" && <TicketsTab db={db} />}
      {tab === "tags" && <TagsTab db={db} />}
    </div>
  );
}

type Db = ReturnType<typeof supabaseAdmin>;

async function DiffTab({ db, runId }: { db: Db; runId: string | null }) {
  const q = db.from("import_diffs").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(300);
  const { data } = runId ? await q.eq("run_id", runId) : await q;
  const keys = Array.from(new Set((data ?? []).filter((d) => d.entity === "event").map((d) => d.record_key)));
  const { data: names } = keys.length ? await db.from("events").select("tedx_event_id, name").in("tedx_event_id", keys) : { data: [] as any[] };
  const nameBy = new Map((names ?? []).map((n: any) => [n.tedx_event_id, n.name]));
  const rows: DiffRow[] = (data ?? []).map((d) => ({ ...d, name: nameBy.get(d.record_key) ?? null }));
  return <DiffPanel runId={runId} rows={rows} />;
}

async function VerifyTab({ db }: { db: Db }) {
  const { data } = await db.from("verify_queue").select("*").order("interest", { ascending: false }).order("stale_days", { ascending: false }).limit(100);
  const ids = (data ?? []).map((r) => r.id);
  const { data: extra } = ids.length ? await db.from("events").select("id, event_url, form_url, status_source_url").in("id", ids) : { data: [] as any[] };
  const by = new Map((extra ?? []).map((e: any) => [e.id, e]));
  const rows: VerifyRow[] = (data ?? []).map((r) => ({ ...r, event_url: by.get(r.id)?.event_url ?? null, form_url: by.get(r.id)?.form_url ?? null, status_source_url: by.get(r.id)?.status_source_url ?? null }));
  return <VerifyPanel rows={rows} />;
}

async function DedupTab({ db }: { db: Db }) {
  const { data: flagged } = await db.from("events").select("id, name, city, event_date").eq("expired", false).eq("needs_review", true).limit(60);
  const rows: DedupRow[] = [];
  for (const e of flagged ?? []) {
    const { data: cands } = await db.rpc("event_dedup_candidates", { p_event: e.id });
    for (const c of (cands ?? []) as any[]) {
      const { data: ce } = await db.from("events").select("id, name, city, event_date, expired").eq("id", c.candidate_id).maybeSingle();
      if (ce && !ce.expired) rows.push({ id: e.id, name: e.name, city: e.city, event_date: e.event_date, candidate_id: ce.id, candidate_name: ce.name, candidate_city: ce.city, candidate_date: ce.event_date, similarity: Number(c.similarity), km: c.km, days_apart: c.days_apart });
    }
  }
  return <DedupPanel rows={rows} />;
}

async function OrganizersTab({ db }: { db: Db }) {
  const [{ data: orgs }, { data: contacts }, { data: evs }] = await Promise.all([
    db.from("organizers").select("id, name, website_domain, city, country_code, removal_requested_at, removal_due_at").order("removal_requested_at", { ascending: false, nullsFirst: false }).order("name").limit(200),
    db.from("organizer_contacts").select("organizer_id, public_contact_email, public_contact_role, contact_source_url, contact_seen_at, lawful_basis_note"),
    db.from("events").select("organizer_id").eq("expired", false),
  ]);
  const contactBy = new Map((contacts ?? []).map((c) => [c.organizer_id, c]));
  const count = new Map<string, number>(); for (const e of evs ?? []) if (e.organizer_id) count.set(e.organizer_id, (count.get(e.organizer_id) ?? 0) + 1);
  const rows: OrganizerRow[] = (orgs ?? []).map((o) => ({ ...o, contact: (contactBy.get(o.id) as any) ?? null, events: count.get(o.id) ?? 0 }));
  return <OrganizersPanel rows={rows} />;
}

async function TicketsTab({ db }: { db: Db }) {
  const { data } = await db.from("event_reports").select("id, kind, url, note, created_at, event_id, events(name)").eq("status", "open").order("created_at", { ascending: false }).limit(100);
  const rows: TicketRow[] = ((data ?? []) as any[]).map((t) => ({ id: t.id, kind: t.kind, url: t.url, note: t.note, created_at: t.created_at, event_id: t.event_id, event_name: t.events?.name ?? null }));
  return <TicketsPanel rows={rows} />;
}

async function TagsTab({ db }: { db: Db }) {
  const { data: pending } = await db.from("event_topics").select("event_id, tag, accepted").eq("accepted", false).limit(400);
  const ids = Array.from(new Set((pending ?? []).map((p) => p.event_id))).slice(0, 40);
  const { data: evs } = ids.length ? await db.from("events").select("id, name, theme").in("id", ids) : { data: [] as any[] };
  const rows: TagRow[] = (evs ?? []).map((e: any) => ({ event_id: e.id, name: e.name, theme: e.theme, tags: (pending ?? []).filter((p) => p.event_id === e.id).map((p) => ({ tag: p.tag, accepted: p.accepted })) }));
  return <TagsPanel rows={rows} />;
}
