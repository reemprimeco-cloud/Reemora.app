import { createServiceRoleClient } from "@/lib/supabase/server";
import { notify } from "@/lib/lounge/notify";

/** Re-checks every active achievement for one member and awards whatever
 *  they now qualify for. The decision and the award both happen inside the
 *  database function (lounge_evaluate_achievements, migration 0028), which
 *  is idempotent — calling this twice can never double-award. The function
 *  returns the codes awarded *this* call so we can notify just for those.
 *  Best-effort: never throws into the request that triggered it. */
export async function evaluateAchievements(userId: string): Promise<string[]> {
  try {
    const service = await createServiceRoleClient();
    const { data, error } = await service.rpc("lounge_evaluate_achievements", { p_user_id: userId });
    if (error) {
      console.error("lounge_evaluate_achievements:", error.message);
      return [];
    }
    const codes = (data ?? []) as string[];
    if (!codes.length) return [];

    const { data: defs } = await service.from("lounge_achievements").select("code, name, points").in("code", codes);
    for (const def of defs ?? []) {
      await notify(service, {
        userId,
        type: "achievement",
        title: `🏆 Achievement unlocked: ${def.name}`,
        body: def.points > 0 ? `+${def.points} points added to your profile.` : null,
        url: `/lounge/members/${userId}`,
        dedupeKey: `achievement:${userId}:${def.code}`,
      });
    }
    return codes;
  } catch (err) {
    console.error("evaluateAchievements:", err);
    return [];
  }
}
