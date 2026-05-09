import { Suspense } from "react";
import { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUserType } from "@/lib/actions/auth-actions";

function DashboardLayoutFallback() {
  return (
    <div className="flex min-h-svh w-full">
      <div className="hidden w-64 shrink-0 flex-col gap-4 border-r bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Skeleton className="h-16 w-full shrink-0 border-b" />
        <div className="flex-1 p-4">
          <Skeleton className="mx-auto h-96 max-w-6xl rounded-lg border" />
        </div>
      </div>
    </div>
  );
}

async function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const userType = await getSessionUserType();

  return (
    <SidebarProvider>
      <AppSidebar isSuperAdmin={userType === "super_admin"} />
      <SidebarInset className="min-h-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-center"
          />
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
