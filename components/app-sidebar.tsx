import * as React from "react"

import { BranchSwitcher } from "@/components/branch-switcher"
import { SidebarNavGroups } from "@/components/sidebar-nav-groups"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"

export function AppSidebar({
  isSuperAdmin,
  ...props
}: { isSuperAdmin: boolean } & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <BranchSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarNavGroups isSuperAdmin={isSuperAdmin} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
