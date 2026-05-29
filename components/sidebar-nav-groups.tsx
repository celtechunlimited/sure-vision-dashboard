"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  CalendarClock,
  ChevronRight,
  IdCard,
  LayoutDashboard,
  Package,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type SidebarNavLinkItem = {
  kind?: "link";
  title: string;
  href: string;
  icon: LucideIcon;
};

export type SidebarNavCollapsibleItem = {
  kind: "collapsible";
  title: string;
  icon: LucideIcon;
  /** Prefix for pathIsActive (e.g. "/admin/users" matches patients/employees sub-routes). */
  sectionHref: string;
  items: { title: string; href: string; icon: LucideIcon }[];
};

export type SidebarNavItem = SidebarNavLinkItem | SidebarNavCollapsibleItem;

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
    {
      kind: "collapsible",
      title: "Users",
      icon: Users,
      sectionHref: "/admin/users",
      items: [
        {
          title: "Patients",
          href: "/admin/users/patients",
          icon: UserRound,
        },
        {
          title: "Employees",
          href: "/admin/users/employees",
          icon: IdCard,
        },
      ],
    },
  ],
};

function SidebarCollapsibleNavItem({
  pathname,
  item,
}: {
  pathname: string;
  item: SidebarNavCollapsibleItem;
}) {
  const ParentIcon = item.icon;
  const sectionActive = pathIsActive(pathname, item.sectionHref);
  const [expanded, setExpanded] = React.useState(sectionActive);

  React.useEffect(() => {
    if (sectionActive) setExpanded(true);
    else setExpanded(false);
  }, [pathname, sectionActive]);

  const open = sectionActive || expanded;

  return (
    <SidebarMenuItem>
      <CollapsiblePrimitive.Root
        open={open}
        onOpenChange={setExpanded}
        className="group/collapsible w-full"
      >
        <CollapsiblePrimitive.Trigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={sectionActive}>
            <ParentIcon />
            <span>{item.title}</span>
            <ChevronRight
              className={cn(
                "ml-auto transition-transform",
                open && "rotate-90",
              )}
            />
          </SidebarMenuButton>
        </CollapsiblePrimitive.Trigger>
        <CollapsiblePrimitive.Content>
          <SidebarMenuSub>
            {item.items.map((sub) => {
              const SubIcon = sub.icon;
              return (
                <SidebarMenuSubItem key={sub.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathIsActive(pathname, sub.href)}
                  >
                    <Link href={sub.href}>
                      <SubIcon />
                      <span>{sub.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsiblePrimitive.Content>
      </CollapsiblePrimitive.Root>
    </SidebarMenuItem>
  );
}

const branchOperationsNav: SidebarNavGroup = {
  title: "Branch Operations",
  items: [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    // { title: "Calendar", href: "/calendar", icon: Calendar },
    { title: "Patients", href: "/patients", icon: UserRound },
    // { title: "Appointments", href: "/appointments", icon: CalendarClock },
    // {
    //   kind: "collapsible",
    //   title: "Inventory",
    //   icon: Package,
    //   sectionHref: "/inventory",
    //   items: [
    //     { title: "Products", href: "/inventory/products", icon: Package },
    //     {
    //       title: "Stock Movement",
    //       href: "/inventory/stock-movements",
    //       icon: ArrowRightLeft,
    //     },
    //   ],
    // },
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
                if (item.kind === "collapsible") {
                  return (
                    <SidebarCollapsibleNavItem
                      key={`${group.title}-${item.title}`}
                      pathname={pathname}
                      item={item}
                    />
                  );
                }

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
