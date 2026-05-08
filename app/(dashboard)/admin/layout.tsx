import { Suspense } from "react";
import { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function AdminSectionFallback() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

async function AdminSectionGate({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.user_type !== "super_admin") {
    redirect("/");
  }

  return <>{children}</>;
}

export default function AdminSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<AdminSectionFallback />}>
      <AdminSectionGate>{children}</AdminSectionGate>
    </Suspense>
  );
}
