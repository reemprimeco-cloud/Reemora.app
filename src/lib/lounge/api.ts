import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { LoungeMemberRow } from "@/lib/supabase/lounge.types";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { fieldErrorsOf } from "@/lib/lounge/validation";

export type Db = SupabaseClient<Database>;

export function jsonError(message: string, status = 400, fieldErrors?: Record<string, string>) {
  return NextResponse.json(fieldErrors ? { error: message, fieldErrors } : { error: message }, { status });
}

/** Parses + validates a JSON body. Returns a NextResponse on failure so the
 *  caller can `if (parsed instanceof NextResponse) return parsed;`. */
export async function parseBody<S extends z.ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S> | NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return jsonError("Please fix the highlighted fields.", 400, fieldErrorsOf(result.error));
  }
  return result.data;
}

export interface UserContext {
  supabase: Db;
  user: User;
}

export interface MemberContext extends UserContext {
  member: LoungeMemberRow;
}

export interface AdminContext extends UserContext {
  service: Db;
}

/** Cookie-authenticated user, or a 401/503 response. */
export async function requireUser(): Promise<UserContext | NextResponse> {
  if (!isSupabaseConfigured) return jsonError("The Lounge isn't connected yet.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return jsonError("Not signed in.", 401);
  return { supabase, user: data.user };
}

/** Approved Lounge member, or a 401/403 response. RLS re-checks this on
 *  every query anyway; this is here so routes can fail early with a clear
 *  message instead of a policy violation. */
export async function requireMember(): Promise<MemberContext | NextResponse> {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { data: member } = await ctx.supabase.from("lounge_members").select("*").eq("user_id", ctx.user.id).maybeSingle();
  if (!member || member.status !== "approved") {
    return jsonError("You need an approved Lounge membership to do that.", 403);
  }
  return { ...ctx, member };
}

/** Site admin (public.users.role = 'admin'), with a service-role client for
 *  the privileged write. The role check happens here on the server using
 *  the caller's own session — never trusted from the request body. */
export async function requireAdmin(): Promise<AdminContext | NextResponse> {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { data: profile } = await ctx.supabase.from("users").select("role").eq("id", ctx.user.id).maybeSingle();
  if (profile?.role !== "admin") return jsonError("Admin access required.", 403);
  const service = await createServiceRoleClient();
  return { ...ctx, service };
}

/** Append-only record of privileged actions. Never throws into the caller. */
export async function logAudit(
  service: Db,
  entry: { actorId: string | null; action: string; targetType: string; targetId?: string | null; details?: Record<string, unknown> }
): Promise<void> {
  const { error } = await service.from("lounge_audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId ?? null,
    details: (entry.details ?? {}) as never,
  });
  if (error) console.error("lounge_audit_log insert failed:", error.message);
}
