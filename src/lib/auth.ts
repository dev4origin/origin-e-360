import { createServerSupabase } from "@/lib/supabase/server";
import type { GodModeStaff } from "@/lib/types";

/**
 * Get the current God Mode staff member (server-side)
 * Returns null if not a God Mode staff member
 */
export async function getGodModeStaff(): Promise<GodModeStaff | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("god_mode_staff")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return data;
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(
  pillar: string,
  resource: string,
  action: "read" | "write" | "delete" | "export" | "approve",
): Promise<boolean> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("check_gm_permission", {
    p_pillar: pillar,
    p_resource: resource,
    p_action: action,
  });

  return data === true;
}
