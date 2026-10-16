import { createClient } from "@/lib/supabase/server";
import type { Db } from "@/lib/lounge/api";
import type { LoungeChallengeRow, LoungeChallengeEntryRow, LoungeChallengeAwardRow } from "@/lib/supabase/lounge.types";

export interface EntryWithMember extends LoungeChallengeEntryRow {
  member: { user_id: string; display_name: string; avatar_url: string | null };
}

export interface ChallengeDetail {
  challenge: LoungeChallengeRow;
  entries: EntryWithMember[];
  awards: LoungeChallengeAwardRow[];
  myEntry: LoungeChallengeEntryRow | null;
  myVoteEntryId: string | null;
}

const ENTRY_SELECT = "*, member:lounge_members!lounge_challenge_entries_member_id_fkey(user_id, display_name, avatar_url)";

type RawEntry = LoungeChallengeEntryRow & { member: EntryWithMember["member"] | EntryWithMember["member"][] | null };

function shapeEntry(e: RawEntry): EntryWithMember {
  const m = Array.isArray(e.member) ? e.member[0] : e.member;
  return { ...e, member: m ?? { user_id: e.member_id, display_name: "Member", avatar_url: null } };
}

/** Effective phase, combining the admin-set status with the time windows
 *  so the UI never shows "vote" after the deadline even if nobody has
 *  flipped the status yet. */
export function effectivePhase(c: LoungeChallengeRow, now = Date.now()): LoungeChallengeRow["status"] {
  if (c.status === "open") {
    if (c.submissions_open_at && now < Date.parse(c.submissions_open_at)) return "draft";
    if (c.submissions_close_at && now > Date.parse(c.submissions_close_at)) return "closed";
  }
  if (c.status === "voting") {
    if (c.voting_open_at && now < Date.parse(c.voting_open_at)) return "closed";
    if (c.voting_close_at && now > Date.parse(c.voting_close_at)) return "closed";
  }
  return c.status;
}

export async function loadChallenges(supabase?: Db): Promise<{ active: LoungeChallengeRow[]; past: LoungeChallengeRow[] }> {
  const db = supabase ?? (await createClient());
  const { data } = await db.from("lounge_challenges").select("*").neq("status", "draft").order("created_at", { ascending: false });
  const all = data ?? [];
  return {
    active: all.filter((c) => !["finalized", "cancelled"].includes(c.status)),
    past: all.filter((c) => ["finalized", "cancelled"].includes(c.status)),
  };
}

export async function loadChallengeDetail(id: string, viewerId: string, supabase?: Db): Promise<ChallengeDetail | null> {
  const db = supabase ?? (await createClient());
  const { data: challenge } = await db.from("lounge_challenges").select("*").eq("id", id).maybeSingle();
  if (!challenge) return null;

  const [{ data: entries }, { data: awards }, { data: vote }] = await Promise.all([
    db.from("lounge_challenge_entries").select(ENTRY_SELECT).eq("challenge_id", id).order("vote_count", { ascending: false }).order("created_at", { ascending: true }),
    db.from("lounge_challenge_awards").select("*").eq("challenge_id", id).order("place"),
    db.from("lounge_challenge_votes").select("entry_id").match({ challenge_id: id, voter_id: viewerId }).maybeSingle(),
  ]);

  const shaped = ((entries ?? []) as unknown as RawEntry[]).map(shapeEntry);
  const mine = shaped.find((e) => e.member_id === viewerId) ?? null;
  return {
    challenge,
    entries: challenge.status === "finalized" ? shaped.sort((a, b) => (a.final_rank ?? 999) - (b.final_rank ?? 999)) : shaped,
    awards: awards ?? [],
    myEntry: mine,
    myVoteEntryId: vote?.entry_id ?? null,
  };
}
