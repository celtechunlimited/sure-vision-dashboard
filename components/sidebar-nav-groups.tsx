"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calendar,
  CalendarClock,
  IdCard,
  LayoutDashboard,
  Package,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type SidebarNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type SidebarNavGroup = {
  title: string;
  items: SidebarNavItem[];
};

function pathIsActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const administrationNav: SidebarNavGroup = {
  title: "Administration",
  items: [
    { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Branches", href: "/admin/branches", icon: Building2 },
    { title: "Users", href: "/admin/users", icon: Users },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ],
};

const branchOperationsNav: SidebarNavGroup = {
  title: "Branch Operations",
  items: [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Calendar", href: "/calendar", icon: Calendar },
    { title: "Patients", href: "/patients", icon: UserRound },
    { title: "Appointments", href: "/appointments", icon: CalendarClock },
    { title: "Inventory", href: "/inventory", icon: Package },
    { title: "Employees", href: "/employees", icon: IdCard },
  ],
};

export function SidebarNavGroups({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname() ?? "";

  const groups: SidebarNavGroup[] = [
    ...(isSuperAdmin ? [administrationNav] : []),
    branchOperationsNav,
  ];

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={`${group.title}-${item.href}`}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathIsActive(pathname, item.href)}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
