import { supabase } from "./supabase";

export async function getUserPlan(userId: string) {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return "free";

    return data.plan;
  } catch (err) {
    console.error("Error fetching user plan:", err);
    return "free";
  }
}
