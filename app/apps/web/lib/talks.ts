import { supabaseServer } from "@/lib/supabase/server";
import type { JourneyInput, Stage, TalkPath } from "@/lib/journey/recommender";
import { dossierChars } from "@/lib/find/interview";

// The Talk Record is the spine (5.1). One active talk at a time by default; the member can have more.

export interface Talk {
  id: string; user_id: string; title: string | null; path: TalkPath; stage: Stage; idea_id: string | null;
  slot_minutes: number; target_wpm: number; measured_wpm: number | null; event_id: string | null; event_date: string | null; publication: string; published_url: string | null;
  archived_at: string | null; created_at: string;
}

export async function currentTalk(userId: string, talkId?: string): Promise<Talk | null> {
  const sb = await supabaseServer();
  let q = sb.from("talks").select("*").eq("user_id", userId).is("archived_at", null).order("created_at", { ascending: false }).limit(1);
  if (talkId) q = sb.from("talks").select("*").eq("user_id", userId).eq("id", talkId).limit(1);
  const { data } = await q.maybeSingle();
  return (data as Talk) ?? null;
}

export async function listTalks(userId: string): Promise<Talk[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("talks").select("*").eq("user_id", userId).is("archived_at", null).order("created_at", { ascending: false });
  return (data as Talk[]) ?? [];
}

// Everything the recommender and the Journey need, read in one pass with RLS on.
export async function loadJourneyInput(userId: string, talk: Talk): Promise<JourneyInput> {
  const sb = await supabaseServer();
  const weekStart = mondayIso(new Date());
  const [ideas, dossier, targets, apps, prior, brief, outline, script, beats, runs, launch, week, lastAct] = await Promise.all([
    sb.from("ideas").select("id, status").eq("talk_id", talk.id).neq("status", "archived"),
    sb.from("idea_dossiers").select("answers, pasted_material").eq("talk_id", talk.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("target_list").select("event_id").eq("talk_id", talk.id),
    sb.from("applications").select("status, applied_at, follow_up_at, event_id, event_name_manual, events(name, application_deadline)").eq("talk_id", talk.id),
    sb.from("prior_stages").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("idea_briefs").select("char_count, is_draft").eq("talk_id", talk.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("outline_versions").select("id").eq("talk_id", talk.id).eq("status", "final").limit(1).maybeSingle(),
    sb.from("scripts").select("locked_version_id").eq("talk_id", talk.id).limit(1).maybeSingle(),
    sb.rpc("beat_summary", { p_talk: talk.id }).maybeSingle(),
    sb.from("timed_runs").select("duration_s").eq("talk_id", talk.id).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("launch_plans").select("plan").eq("talk_id", talk.id).limit(1).maybeSingle(),
    sb.from("week_commitments").select("target, completed, paused").eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
    sb.from("activity_log").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const ideaRows = (ideas.data ?? []) as { id: string; status: string }[];
  const appRows = ((apps.data ?? []) as any[]).map((a) => ({
    status: a.status as string, appliedAt: a.applied_at as string | null, followUpAt: a.follow_up_at as string | null,
    eventName: (a.events?.name as string | undefined) ?? (a.event_name_manual as string) ?? "an event", deadline: (a.events?.application_deadline as string | null) ?? null,
  }));
  const trackedIds = new Set<string>([...((targets.data ?? []) as any[]).map((t) => t.event_id), ...((apps.data ?? []) as any[]).map((a) => a.event_id).filter(Boolean)]);
  const beatSum = (beats.data as { mastered: number; total: number; due: number } | null) ?? { mastered: 0, total: 0, due: 0 };
  const run = runs.data as { duration_s: number } | null;
  const slotSeconds = talk.slot_minutes * 60;
  const planSteps = ((launch.data?.plan as { done?: boolean }[] | undefined) ?? []).filter((x) => x.done).length;
  return {
    path: talk.path, stage: talk.stage,
    ideaCount: ideaRows.filter((i) => i.status === "candidate").length,
    ideaLocked: ideaRows.some((i) => i.status === "locked"),
    dossierChars: dossier.data ? dossierChars((dossier.data.answers as Record<string, string>) ?? {}, dossier.data.pasted_material) : 0,
    trackedEvents: trackedIds.size,
    applications: appRows,
    priorStages: prior.count ?? 0,
    briefChars: brief.data && !brief.data.is_draft ? brief.data.char_count : (brief.data?.char_count ?? 0),
    outlineFinal: !!outline.data,
    scriptLocked: !!script.data?.locked_version_id,
    fitToTime: run ? run.duration_s <= slotSeconds : null,
    beatsMastered: beatSum.mastered,
    beatsTotal: beatSum.total,
    beatsDue: beatSum.due,
    eventDate: talk.event_date,
    published: talk.publication === "published" || !!talk.published_url,
    launchSteps: planSteps,
    weekCompleted: week.data?.completed ?? 0,
    weekTarget: week.data?.target ?? 3,
    weekPaused: week.data?.paused ?? false,
    lastActivityAt: lastAct.data?.created_at ?? null,
  };
}

export function mondayIso(d: Date) {
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (u.getUTCDay() + 6) % 7;   // Monday = 0
  u.setUTCDate(u.getUTCDate() - dow);
  return u.toISOString().slice(0, 10);
}
