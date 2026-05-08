"use client";

import * as React from "react";
import { Check, ChevronsUpDown, GalleryVerticalEnd } from "lucide-react";

import { getBranchesForSwitcher } from "@/lib/actions/branch-actions";
import { useBranchStore } from "@/lib/stores/branch-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function BranchSwitcher() {
  const branches = useBranchStore((s) => s.branches);
  const selectedBranchId = useBranchStore((s) => s.selectedBranchId);
  const setBranches = useBranchStore((s) => s.setBranches);
  const setSelectedBranchId = useBranchStore((s) => s.setSelectedBranchId);

  const [hydrated, setHydrated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [canSwitchBranches, setCanSwitchBranches] = React.useState(false);

  React.useEffect(() => {
    if (useBranchStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useBranchStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await getBranchesForSwitcher();
      if (cancelled) return;

      const { branches: rows, userBranchId, canSwitchBranches: canSwitch } =
        result;
      setCanSwitchBranches(canSwitch);
      setBranches(rows);

      const ids = new Set(rows.map((b) => b.id));
      const current = useBranchStore.getState().selectedBranchId;

      let next: string | null = null;
      if (!canSwitch) {
        next = userBranchId && ids.has(userBranchId) ? userBranchId : rows[0]?.id ?? null;
      } else if (current && ids.has(current)) {
        next = current;
      } else if (userBranchId && ids.has(userBranchId)) {
        next = userBranchId;
      } else {
        next = rows[0]?.id ?? null;
      }

      if (next !== current) {
        setSelectedBranchId(next);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [hydrated, setBranches, setSelectedBranchId]);

  const selected = branches.find((b) => b.id === selectedBranchId);

  const title = loading
    ? "Loading…"
    : selected?.long_name ??
      (branches.length === 0 ? "No branch assigned" : "Branch");
  const subtitle = loading ? "" : selected?.short_name ?? "";

  const branchButton = (
    <SidebarMenuButton
      size="lg"
      className={
        canSwitchBranches
          ? "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          : undefined
      }
      disabled={loading || branches.length === 0}
    >
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <GalleryVerticalEnd className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none">
        <span className="truncate font-medium">{title}</span>
        {subtitle ? (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
      {canSwitchBranches ? (
        <ChevronsUpDown className="ml-auto shrink-0" />
      ) : null}
    </SidebarMenuButton>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {canSwitchBranches ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{branchButton}</DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width)"
              align="start"
            >
              {branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  className="flex items-center gap-2"
                  onSelect={() => setSelectedBranchId(branch.id)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{branch.long_name}</span>
                    <span className="ml-1 text-muted-foreground">
                      ({branch.short_name})
                    </span>
                  </span>
                  {branch.id === selectedBranchId ? (
                    <Check className="size-4 shrink-0" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          branchButton
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
