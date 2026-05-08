"use client";

import { getNavUserProfile, signOutAction } from "@/lib/actions/auth-actions";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() ?? "?";
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await signOutAction();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const profile = await getNavUserProfile();
      if (cancelled) return;
      if (!profile) {
        setLoading(false);
        return;
      }
      setDisplayName(profile.displayName);
      setEmail(profile.email);
      setAvatarUrl(profile.avatarUrl);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const fallback = initialsFromName(displayName || email || "?");
  const label = loading ? "…" : displayName || email || "User";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={loading}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={label} />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {loading ? "…" : fallback}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{label}</span>
                <span className="truncate text-xs">
                  {loading ? "…" : email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={label} />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {loading ? "…" : fallback}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{label}</span>
                  <span className="truncate text-xs">
                    {loading ? "…" : email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
