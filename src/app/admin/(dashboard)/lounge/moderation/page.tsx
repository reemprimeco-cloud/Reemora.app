import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { LoungeModerationManager, type ReportItem, type ContentItem } from "@/components/admin/lounge-moderation-manager";

export const metadata: Metadata = { title: "Lounge Moderation" };
export const dynamic = "force-dynamic";

export default async function AdminLoungeModerationPage() {
  let reports: ReportItem[] = [];
  let posts: ContentItem[] = [];
  let comments: ContentItem[] = [];
  let chat: ContentItem[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: reportRows }, { data: postRows }, { data: commentRows }, { data: chatRows }, { data: members }] = await Promise.all([
      supabase.from("lounge_reports").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("lounge_posts").select("id, author_id, title, body, is_hidden, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("lounge_comments").select("id, author_id, body, is_hidden, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("lounge_chat_messages").select("id, author_id, body, is_hidden, created_at").order("created_at", { ascending: false }).limit(150),
      supabase.from("lounge_members").select("user_id, display_name"),
    ]);
    const nameOf = (id: string) => (members ?? []).find((m) => m.user_id === id)?.display_name ?? "Member";

    const postById = new Map((postRows ?? []).map((p) => [p.id, p]));
    const commentById = new Map((commentRows ?? []).map((c) => [c.id, c]));
    const chatById = new Map((chatRows ?? []).map((c) => [c.id, c]));

    // Reported content may be older than the recent lists above; fetch any
    // missing rows individually so the report always shows its target.
    for (const r of reportRows ?? []) {
      if (r.target_type === "post" && !postById.has(r.target_id)) {
        const { data } = await supabase.from("lounge_posts").select("id, author_id, title, body, is_hidden, created_at").eq("id", r.target_id).maybeSingle();
        if (data) postById.set(data.id, data);
      } else if (r.target_type === "comment" && !commentById.has(r.target_id)) {
        const { data } = await supabase.from("lounge_comments").select("id, author_id, body, is_hidden, created_at").eq("id", r.target_id).maybeSingle();
        if (data) commentById.set(data.id, data);
      } else if (r.target_type === "chat_message" && !chatById.has(r.target_id)) {
        const { data } = await supabase.from("lounge_chat_messages").select("id, author_id, body, is_hidden, created_at").eq("id", r.target_id).maybeSingle();
        if (data) chatById.set(data.id, data);
      }
    }

    reports = (reportRows ?? []).map((r) => {
      let preview: string | null = null;
      let author: string | null = null;
      let hidden: boolean | null = null;
      if (r.target_type === "post") {
        const p = postById.get(r.target_id);
        if (p) {
          preview = `${p.title} — ${p.body}`;
          author = nameOf(p.author_id);
          hidden = p.is_hidden;
        }
      } else if (r.target_type === "comment") {
        const c = commentById.get(r.target_id);
        if (c) {
          preview = c.body;
          author = nameOf(c.author_id);
          hidden = c.is_hidden;
        }
      } else if (r.target_type === "chat_message") {
        const c = chatById.get(r.target_id);
        if (c) {
          preview = c.body;
          author = nameOf(c.author_id);
          hidden = c.is_hidden;
        }
      } else {
        preview = nameOf(r.target_id);
      }
      return { id: r.id, target_type: r.target_type, target_id: r.target_id, reason: r.reason, status: r.status, created_at: r.created_at, reporter_name: nameOf(r.reporter_id), preview, target_author: author, target_hidden: hidden };
    });

    posts = (postRows ?? []).map((p) => ({ id: p.id, kind: "post", author_id: p.author_id, author_name: nameOf(p.author_id), preview: `${p.title} — ${p.body}`, is_hidden: p.is_hidden, created_at: p.created_at }));
    comments = (commentRows ?? []).map((c) => ({ id: c.id, kind: "comment", author_id: c.author_id, author_name: nameOf(c.author_id), preview: c.body, is_hidden: c.is_hidden, created_at: c.created_at }));
    chat = (chatRows ?? []).map((c) => ({ id: c.id, kind: "chat_message", author_id: c.author_id, author_name: nameOf(c.author_id), preview: c.body, is_hidden: c.is_hidden, created_at: c.created_at }));
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Lounge Moderation</h1>
      <p className="mb-7 text-sm text-ink-soft">Reported content, plus the latest posts, comments and chat. Hiding keeps the record; deleting is permanent. Every action is logged and the author is notified.</p>
      <LoungeModerationManager reports={reports} posts={posts} comments={comments} chat={chat} />
    </div>
  );
}
