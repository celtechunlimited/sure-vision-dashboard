"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type NavUserProfile = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

export async function getNavUserProfile(): Promise<NavUserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;

  const { data: profile } = await supabase
    .from("users")
    .select("user_type, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      displayName: user.email ?? "",
      email: user.email ?? "",
      avatarUrl,
    };
  }

  let displayName = profile.email;

  if (profile.user_type === "super_admin") {
    displayName = "Admin";
  } else if (profile.user_type === "employee") {
    const { data: emp } = await supabase
      .from("employees")
      .select("prefix, first_name, last_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const parts = [emp?.prefix, emp?.first_name, emp?.last_name]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
    displayName = parts.length > 0 ? parts.join(" ") : profile.email;
  }

  return {
    displayName,
    email: profile.email,
    avatarUrl,
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}
