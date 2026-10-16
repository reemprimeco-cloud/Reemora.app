/**
 * Reemora Lounge tables — hand-authored to match supabase/migrations/0026+.
 * Merged into the Database type in database.types.ts so the same typed
 * clients cover the community features.
 */
import type { Json } from "@/lib/supabase/database.types";

export type LoungeTable<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type LoungeMemberStatus = "pending" | "approved" | "rejected" | "suspended";
export type LoungeMembershipAction = "applied" | "invited" | "approved" | "rejected" | "suspended" | "reactivated" | "note";
export type LoungePostType = "discussion" | "question" | "project" | "milestone" | "tool";
export type LoungeProjectStatus = "prototype" | "in_progress" | "completed";
export type LoungeReportTarget = "post" | "comment" | "chat_message" | "member";
export type LoungeReportStatus = "open" | "resolved" | "dismissed";
export type LoungeAchievementTier = "bronze" | "silver" | "gold" | "platinum";
export type LoungeChallengeStatus = "draft" | "open" | "paused" | "voting" | "closed" | "finalized" | "cancelled";
export type LoungeEntryStatus = "submitted" | "approved" | "rejected" | "withdrawn";
export type LoungeBadgeCode = "champion" | "runner_up" | "third" | "winner";

export type LoungeSocialLinks = {
  instagram?: string;
  linkedin?: string;
  x?: string;
  youtube?: string;
  github?: string;
  other?: string;
}

export type LoungeMemberRow = {
  user_id: string;
  status: LoungeMemberStatus;
  display_name: string;
  bio: string | null;
  skills: string[];
  website_url: string | null;
  social_links: Json;
  avatar_url: string | null;
  show_email: boolean;
  show_phone: boolean;
  points_total: number;
  followers_count: number;
  following_count: number;
  chat_muted_until: string | null;
  applied_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
  invited_at: string | null;
  invited_by: string | null;
  is_verified: boolean;
  badge_label: string | null;
  created_at: string;
  updated_at: string;
}

export type LoungeMembershipEventRow = {
  id: string;
  user_id: string;
  action: LoungeMembershipAction;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export type LoungeFollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type LoungePostRow = {
  id: string;
  author_id: string;
  type: LoungePostType;
  title: string;
  body: string;
  project_url: string | null;
  project_category: string | null;
  project_status: LoungeProjectStatus | null;
  tools: string[];
  image_url: string | null;
  gallery_urls: string[];
  like_count: number;
  comment_count: number;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type LoungeCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  is_helpful: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export type LoungePostLikeRow = {
  post_id: string;
  user_id: string;
  created_at: string;
}

export type LoungeBookmarkRow = {
  user_id: string;
  post_id: string;
  created_at: string;
}

export type LoungeChatMessageRow = {
  id: string;
  author_id: string;
  body: string;
  reply_to_id: string | null;
  is_hidden: boolean;
  created_at: string;
}

export type LoungeReportRow = {
  id: string;
  reporter_id: string;
  target_type: LoungeReportTarget;
  target_id: string;
  reason: string;
  status: LoungeReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export type LoungeNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  actor_id: string | null;
  dedupe_key: string | null;
  is_read: boolean;
  created_at: string;
}

export type LoungeAchievementRow = {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string;
  description_ar: string | null;
  icon: string;
  tier: LoungeAchievementTier;
  points: number;
  criteria_type: string;
  criteria_threshold: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type LoungeMemberAchievementRow = {
  id: string;
  user_id: string;
  achievement_id: string;
  awarded_at: string;
  source: string | null;
  awarded_by: string | null;
}

export type LoungePointsRuleRow = {
  key: string;
  label: string;
  points: number;
  daily_cap: number | null;
  is_active: boolean;
  updated_at: string;
}

export type LoungePointsLedgerRow = {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  ref_type: string;
  ref_id: string;
  actor_id: string | null;
  created_at: string;
}

export type LoungeChallengeRow = {
  id: string;
  title: string;
  description: string;
  rules: string | null;
  categories: string[];
  status: LoungeChallengeStatus;
  submissions_open_at: string | null;
  submissions_close_at: string | null;
  voting_open_at: string | null;
  voting_close_at: string | null;
  max_entries: number | null;
  allow_vote_change: boolean;
  tie_rule: string;
  created_by: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LoungeChallengeEntryRow = {
  id: string;
  challenge_id: string;
  member_id: string;
  title: string;
  description: string;
  project_url: string;
  image_url: string | null;
  gallery_urls: string[];
  tools: string[];
  category: string | null;
  status: LoungeEntryStatus;
  vote_count: number;
  final_rank: number | null;
  created_at: string;
  updated_at: string;
}

export type LoungeChallengeVoteRow = {
  challenge_id: string;
  voter_id: string;
  entry_id: string;
  created_at: string;
  updated_at: string;
}

export type LoungeChallengeAwardRow = {
  id: string;
  challenge_id: string;
  entry_id: string;
  member_id: string;
  place: number;
  badge_code: LoungeBadgeCode;
  points_awarded: number;
  awarded_by: string | null;
  created_at: string;
}

export type LoungeAuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Json;
  created_at: string;
}

export type LoungeFunctions = {
  is_lounge_member: { Args: Record<string, never>; Returns: boolean };
  lounge_member_contact: { Args: { p_user_id: string }; Returns: { email: string | null; phone: string | null }[] };
  lounge_evaluate_achievements: { Args: { p_user_id: string }; Returns: string[] };
  lounge_cast_vote: { Args: { p_entry_id: string }; Returns: Json };
  lounge_finalize_challenge: { Args: { p_challenge_id: string; p_actor_id: string }; Returns: Json };
  lounge_award_points: { Args: { p_user_id: string; p_rule_key: string; p_ref_type: string; p_ref_id: string; p_reason: string; p_actor_id?: string | null }; Returns: boolean };
};
