import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSessionUserType } from "@/lib/actions/auth-actions";
import { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userType = await getSessionUserType();

  return (
    <SidebarProvider>
      <AppSidebar isSuperAdmin={userType === "super_admin"} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-center"
          />
        </header>
        <div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
